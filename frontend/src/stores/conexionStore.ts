/**
 * Store_Conexion — si en este momento se puede hablar con la API.
 *
 * `navigator.onLine` no alcanza. Solo dice si el sistema operativo cree tener
 * una interfaz de red levantada: en el hospital eso es cierto todo el tiempo
 * (hay wifi) y falso lo importante (esa wifi no llega a internet). Con confiar
 * solo en él, la aplicación creería estar en línea y el médico vería fallar
 * cada guardado en vez de que la nota se encole sola.
 *
 * Por eso el estado se compone de dos señales:
 *
 * - `navigator.onLine` como aviso inmediato de que el cable se cayó. Es
 *   instantáneo y fiable en negativo: si dice que no hay red, no la hay.
 * - Un sondeo a `GET /health` como veredicto. Es el único que confirma que el
 *   servidor está del otro lado y responde.
 *
 * Estados posibles:
 * - `en-linea`      → el último sondeo respondió; se escribe contra la API.
 * - `sin-conexion`  → no hay red o el servidor no contesta; todo va a la cola.
 * - `comprobando`   → arranque, antes del primer sondeo.
 */

import { create } from "zustand";
import { BASE_URL } from "@/api/config";

export type EstadoConexion = "comprobando" | "en-linea" | "sin-conexion";

/** Cada cuánto se vuelve a preguntar cuando estamos sin conexión. */
const INTERVALO_SIN_CONEXION = 20_000;
/** Cada cuánto se confirma que seguimos en línea. Más espaciado: no urge. */
const INTERVALO_EN_LINEA = 60_000;
/**
 * Un servidor que tarda más que esto es, para efectos prácticos, un servidor
 * caído: el médico no puede esperar en quirófano. La nota se encola y sigue.
 */
const TIMEOUT_SONDEO = 5_000;

/**
 * El hosting gratuito apaga el servidor tras un rato sin visitas y lo vuelve a
 * levantar con la primera petición que llega, tardando entre medio minuto y
 * uno entero. Para el sondeo normal eso es indistinguible de un servidor
 * caído, y está bien que lo sea: nadie debe esperar un minuto mirando una
 * pantalla. Pero cuando alguien pide despertarlo a propósito, sí se espera.
 */
const TIMEOUT_DESPERTAR = 20_000;

/** Cuánto se insiste en total antes de darlo por muerto de verdad. */
const ESPERA_MAXIMA_DESPERTAR = 90_000;

/** Respiro entre intento e intento al despertar. */
const PAUSA_ENTRE_INTENTOS = 2_000;

/**
 * Un intento que falla en menos que esto no es un servidor arrancando: el
 * servidor dormido deja la petición esperando mientras enciende, mientras que
 * sin red el navegador contesta que no puede al instante.
 */
const FALLO_INMEDIATO = 2_000;

/** Fallos instantáneos seguidos tras los que se deja de insistir. */
const FALLOS_PARA_RENDIRSE = 3;

/**
 * Cada cuánto, como mucho, se vuelve a intentar despertar por las buenas. Sin
 * este freno, un servidor de verdad caído tendría a la aplicación insistiendo
 * en bucle toda la tarde.
 */
const ESPERA_ENTRE_DESPERTARES = 5 * 60_000;

/**
 * Cuándo fue el último intento de despertar. Vive fuera del estado porque no
 * se pinta en ninguna parte: solo sirve para no insistir sin descanso.
 */
let ultimoDespertar = 0;

/**
 * Si toca intentar despertar el servidor solo. Se descarta cuando ya hay un
 * intento en curso, cuando el interruptor de prueba está puesto, cuando el
 * sistema dice que no hay red —ahí no hay nada que despertar— y mientras no
 * haya pasado el tiempo de espera desde el intento anterior.
 */
function convieneDespertar(estado: ConexionState): boolean {
  if (estado.despertando || estado.forzadoSinConexion) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  return Date.now() - ultimoDespertar >= ESPERA_ENTRE_DESPERTARES;
}

interface ConexionState {
  estado: EstadoConexion;
  /** Momento del último sondeo con respuesta, para mostrar "visto por última vez". */
  ultimoContacto: number | null;
  /**
   * Interruptor manual de prueba. Cuando está en `true`, la app se comporta
   * como si no hubiera servidor sin importar lo que diga el sondeo. Existe
   * porque en desarrollo no hay forma natural de "quitar la red": frontend y
   * backend viven ambos en localhost, así que apagar el wifi no corta nada.
   */
  forzadoSinConexion: boolean;
  /** Hay un intento de despertar el servidor en curso (ver `despertar`). */
  despertando: boolean;
  comprobar: () => Promise<boolean>;
  /**
   * Insiste hasta que el servidor dormido termine de arrancar, o hasta que se
   * agote la paciencia. Devuelve si se logró contactar.
   */
  despertar: () => Promise<boolean>;
  /** Fuerza el estado sin sondear. Lo usa el cliente HTTP al detectar un fallo de red. */
  marcarSinConexion: () => void;
  /** Enciende/apaga el interruptor de prueba (ver `forzadoSinConexion`). */
  simularSinConexion: (activo: boolean) => void;
  iniciarVigilancia: () => () => void;
}

/**
 * Un solo sondeo a /health. No lleva credenciales: solo interesa si el servidor
 * responde bien, no quién pregunta.
 *
 * Se considera "hay servidor" solo si /health responde 2xx. Esto importa en
 * desarrollo: el proxy de Vite sigue vivo aunque el backend esté caído, y
 * responde un 5xx en su lugar. Si tomáramos cualquier respuesta como "en línea"
 * (como haría un `return true`), la app nunca detectaría que el backend murió.
 * Un `fetch` que lanza (sin red real) o un 5xx (backend caído) cuentan como
 * sin conexión.
 */
async function sondear(timeout: number = TIMEOUT_SONDEO): Promise<boolean> {
  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), timeout);
  try {
    const r = await fetch(`${BASE_URL.replace(/\/$/, "")}/health`, {
      method: "GET",
      cache: "no-store",
      signal: control.signal,
    });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(corte);
  }
}

/** El interruptor de prueba sobrevive al recargado para poder arrancar la app ya sin servidor. Solo en desarrollo. */
const CLAVE_FORZADO = "hcsc-forzar-sin-conexion";

function forzadoInicial(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return localStorage.getItem(CLAVE_FORZADO) === "true";
  } catch {
    return false;
  }
}

function recordarForzado(activo: boolean): void {
  try {
    if (activo) localStorage.setItem(CLAVE_FORZADO, "true");
    else localStorage.removeItem(CLAVE_FORZADO);
  } catch {
    // Sin almacenamiento el interruptor sigue valiendo para esta sesión.
  }
}

export const useConexionStore = create<ConexionState>()((set, get) => ({
  // Arranca ya en "sin-conexion": la validación de sesión del arranque se
  // dispara antes del primer sondeo y no debe salir a la red.
  estado: forzadoInicial() ? "sin-conexion" : "comprobando",
  ultimoContacto: null,
  forzadoSinConexion: forzadoInicial(),
  despertando: false,

  comprobar: async () => {
    // El interruptor de prueba manda sobre el sondeo: si está encendido, se
    // reporta sin conexión y no se molesta al servidor.
    if (get().forzadoSinConexion) {
      set({ estado: "sin-conexion" });
      return false;
    }

    // Si el sistema ya dice que no hay red, no se gasta un sondeo.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      set({ estado: "sin-conexion" });
      return false;
    }

    const hayServidor = await sondear();
    set({
      estado: hayServidor ? "en-linea" : "sin-conexion",
      ultimoContacto: hayServidor ? Date.now() : get().ultimoContacto,
    });
    return hayServidor;
  },

  /**
   * Despierta el servidor dormido.
   *
   * La petición que llega al hosting es la que enciende la máquina, así que
   * basta con seguir llamando hasta que conteste: cada intento espera mucho
   * más que el sondeo normal, y se reintenta hasta agotar la espera máxima.
   * Es lo que separa "el servidor está apagado" de "no hay internet", que para
   * el sondeo corto se veían igual.
   */
  despertar: async () => {
    if (get().despertando) return false;

    // El interruptor de prueba manda igual que en `comprobar`.
    if (get().forzadoSinConexion) return false;

    set({ despertando: true });
    ultimoDespertar = Date.now();
    try {
      const limite = Date.now() + ESPERA_MAXIMA_DESPERTAR;
      let fallosInmediatos = 0;

      do {
        const inicio = Date.now();
        if (await sondear(TIMEOUT_DESPERTAR)) {
          set({ estado: "en-linea", ultimoContacto: Date.now() });
          return true;
        }

        // Fallar al instante, varias veces seguidas, significa que no hay a
        // quién llamar: no es un servidor arrancando, es que este equipo no
        // llega a internet. Insistir minuto y medio no lo va a arreglar.
        if (Date.now() - inicio < FALLO_INMEDIATO) {
          fallosInmediatos++;
          if (fallosInmediatos >= FALLOS_PARA_RENDIRSE) break;
        } else {
          fallosInmediatos = 0;
        }

        await new Promise((listo) => setTimeout(listo, PAUSA_ENTRE_INTENTOS));
      } while (Date.now() < limite);

      set({ estado: "sin-conexion" });
      return false;
    } finally {
      set({ despertando: false });
    }
  },

  marcarSinConexion: () => {
    if (get().estado !== "sin-conexion") set({ estado: "sin-conexion" });
  },

  simularSinConexion: (activo) => {
    recordarForzado(activo);
    set({
      forzadoSinConexion: activo,
      estado: activo ? "sin-conexion" : "comprobando",
    });
    // Al apagarlo, se vuelve a sondear de inmediato para reconectar sin esperar
    // al próximo ciclo (y disparar la sincronización de lo que quedó pendiente).
    if (!activo) void get().comprobar();
  },

  /**
   * Arranca la vigilancia y devuelve la función para detenerla.
   *
   * El ritmo es deliberadamente asimétrico: sin conexión se pregunta cada 20 s
   * porque recuperar la red es lo que el médico está esperando, y en línea cada
   * minuto porque un corte ya lo delatará la primera petición que falle.
   */
  iniciarVigilancia: () => {
    let temporizador: ReturnType<typeof setTimeout>;

    const ciclo = async () => {
      let enLinea = await get().comprobar();

      // El sondeo corto no distingue un servidor apagado de uno caído, y el
      // hosting gratuito apaga el nuestro cada vez que pasa un rato sin
      // visitas. Así que cuando falla se intenta despertarlo aquí mismo, sin
      // que nadie tenga que pulsar nada: es el caso más común de "no hay
      // servidor" y se arregla solo esperando a que arranque.
      if (!enLinea && convieneDespertar(get())) {
        enLinea = await get().despertar();
      }

      temporizador = setTimeout(
        ciclo,
        enLinea ? INTERVALO_EN_LINEA : INTERVALO_SIN_CONEXION
      );
    };

    // El evento del sistema no es la verdad, pero sí una buena razón para
    // volver a preguntar de inmediato en vez de esperar al próximo ciclo.
    const alCambiar = () => {
      clearTimeout(temporizador);
      void ciclo();
    };

    window.addEventListener("online", alCambiar);
    window.addEventListener("offline", alCambiar);
    void ciclo();

    return () => {
      clearTimeout(temporizador);
      window.removeEventListener("online", alCambiar);
      window.removeEventListener("offline", alCambiar);
    };
  },
}));

/** Lectura puntual fuera de React (cliente HTTP, motor de sincronización). */
export function haySinConexion(): boolean {
  return useConexionStore.getState().estado === "sin-conexion";
}
