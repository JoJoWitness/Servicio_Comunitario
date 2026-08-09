/**
 * Motor de sincronización — vaciar la cola cuando vuelve la red.
 *
 * Lee los pendientes, los manda a `POST /sync` y actúa según lo que responda el
 * servidor para cada uno. Las decisiones de fondo:
 *
 * - **Solo el servidor autoriza a olvidar.** Un pendiente se borra si vino
 *   `creado` o `duplicado`. Cualquier otra cosa —incluido no recibir respuesta—
 *   lo deja donde está. Preferimos subir dos veces (el `client_uuid` lo hace
 *   inofensivo) que perder una nota operatoria.
 * - **Una sola sincronización a la vez.** Si el médico pulsa el botón mientras
 *   corre la automática, la segunda no arranca: dos pasadas simultáneas leerían
 *   la misma cola y mandarían todo por duplicado sin necesidad.
 * - **Los errores se quedan a la vista.** Un ítem rechazado no se reintenta en
 *   bucle: pasa a estado `error` con el motivo del servidor y espera a que
 *   alguien lo corrija. Reintentar solo cambia el resultado si cambia el dato.
 */

import { ApiError, isRedError } from "@/api/errors";
import { sincronizarPendientes, type LotePendiente } from "@/api/endpoints/sync";
import { useSessionStore } from "@/stores/sessionStore";
import {
  listarPendientes,
  marcarError,
  quitarPendiente,
  type Pendiente,
} from "./outbox";

export interface ResumenSync {
  subidos: number;
  fallidos: number;
  /** Quedaron en la cola sin intentarse (no había red, o la sesión venció). */
  pospuestos: number;
  /** Motivo por el que se abortó la pasada entera, si se abortó. */
  motivo?: string;
}

const NADA_QUE_HACER: ResumenSync = { subidos: 0, fallidos: 0, pospuestos: 0 };

/** Candado de pasada única. Ver la segunda regla del encabezado. */
let enCurso: Promise<ResumenSync> | null = null;

/**
 * Sube todo lo pendiente. Si ya hay una sincronización corriendo, devuelve la
 * misma promesa en lugar de lanzar otra.
 */
export function sincronizar(): Promise<ResumenSync> {
  if (enCurso) return enCurso;

  enCurso = ejecutar().finally(() => {
    enCurso = null;
  });

  return enCurso;
}

/** El usuario de la sesión, que es el dueño de lo que se va a subir. */
function usuarioActual(): string | undefined {
  return useSessionStore.getState().perfil?.id;
}

/** Si hay una pasada corriendo ahora mismo. */
export function sincronizando(): boolean {
  return enCurso !== null;
}

async function ejecutar(): Promise<ResumenSync> {
  // Solo se manda lo que está en espera: los que ya fallaron se quedan fuera
  // hasta que alguien los corrija o pida reintentarlos a mano. Sin eso, cada
  // pasada volvería a mandar la misma nota rota para recibir el mismo rechazo.
  // Solo lo del médico de la sesión: es su cookie la que va a respaldar la
  // subida, así que no puede arrastrar el trabajo de otro que use este equipo.
  const enviados = (await listarPendientes(usuarioActual())).filter(
    (p) => p.estado !== "error"
  );
  if (enviados.length === 0) return NADA_QUE_HACER;

  let respuesta;
  try {
    respuesta = await sincronizarPendientes(armarLote(enviados));
  } catch (error) {
    // Sin red: no es un fallo de los datos, es que no era el momento. La cola
    // queda igual y el siguiente intento la encontrará intacta.
    if (isRedError(error)) {
      return { ...NADA_QUE_HACER, pospuestos: enviados.length, motivo: "sin conexión" };
    }

    // Sesión vencida: tampoco se toca nada. El interceptor de 401 ya se encarga
    // de mandar al login, y al volver a entrar la cola sigue completa.
    if (error instanceof ApiError && error.status === 401) {
      return {
        ...NADA_QUE_HACER,
        pospuestos: enviados.length,
        motivo: "la sesión expiró; vuelve a iniciar sesión para subir lo pendiente",
      };
    }

    return {
      ...NADA_QUE_HACER,
      pospuestos: enviados.length,
      motivo: error instanceof Error ? error.message : "error desconocido",
    };
  }

  // Un solo índice con el veredicto de todo el lote, sin importar el tipo: el
  // identificador ya es único entre pacientes y notas.
  const veredictos = new Map(
    [...respuesta.pacientes, ...respuesta.notas].map((r) => [r.cliente_id, r])
  );

  let subidos = 0;
  let fallidos = 0;
  let pospuestos = 0;

  for (const pendiente of enviados) {
    const veredicto = veredictos.get(pendiente.id);

    // El servidor no dijo nada de este ítem. No es "subió" ni "falló": se deja
    // para la próxima, que es lo seguro.
    if (!veredicto) {
      pospuestos++;
      continue;
    }

    if (veredicto.estado === "creado" || veredicto.estado === "duplicado") {
      await quitarPendiente(pendiente.id);
      subidos++;
      continue;
    }

    await marcarError(pendiente.id, veredicto.motivo ?? "el servidor rechazó el envío");
    fallidos++;
  }

  return { subidos, fallidos, pospuestos };
}

/** Separa la cola en las dos listas que espera el endpoint. */
function armarLote(enviados: Pendiente[]): LotePendiente {
  return {
    pacientes: enviados
      .filter((p): p is Extract<Pendiente, { tipo: "paciente" }> => p.tipo === "paciente")
      .map((p) => p.datos),
    notas: enviados
      .filter((p): p is Extract<Pendiente, { tipo: "nota" }> => p.tipo === "nota")
      .map((p) => ({
        clientUuid: p.id,
        nota: p.datos,
        medicoEncargadoId: p.medicoEncargadoId,
      })),
  };
}
