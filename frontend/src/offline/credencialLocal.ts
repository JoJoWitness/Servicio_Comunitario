/**
 * Credencial local — cómo se entra a la aplicación sin servidor que pregunte.
 *
 * El problema: la contraseña la verifica el backend con bcrypt contra la base.
 * Sin red no hay a quién preguntar, y sin embargo el médico tiene que poder
 * abrir la aplicación en un quirófano sin señal y redactar su nota.
 *
 * La solución tiene dos mitades, que es lo que se acordó:
 *
 * 1. **Sesión vigente** → entra directo. Si ya había iniciado sesión y no ha
 *    vencido, se respeta: cerrar y volver a abrir la aplicación no debería
 *    costarle una contraseña que ahora no se puede comprobar.
 * 2. **Sesión vencida o cerrada** → se pide la contraseña y se compara contra
 *    lo que guarda este módulo.
 *
 * Lo que se guarda NO es la contraseña, sino un PBKDF2-SHA256 con sal aleatoria
 * y 310 000 iteraciones (la cifra que recomienda OWASP para este algoritmo).
 * Quien robe el equipo se lleva un hash, no la clave: para sacarla tendría que
 * probar contraseña por contraseña, y cada intento le cuesta esas 310 000
 * vueltas. No es tan bueno como bcrypt del lado del servidor, pero es lo que
 * permite WebCrypto sin arrastrar dependencias, y protege lo que hay que
 * proteger: que la misma contraseña sirva para entrar al sistema en línea.
 *
 * Límite honesto: esto solo funciona para quien ya inició sesión al menos una
 * vez en ese equipo estando conectado. Un médico nuevo en una laptop nueva y
 * sin red no puede entrar, y no hay forma de que pueda.
 */

import type { Usuario } from "@/domain/models";

const CLAVE_ALMACEN = "hcsc-credencial-offline";
const ITERACIONES = 310_000;
const LONGITUD_SAL = 16;
const LONGITUD_HASH = 32;

interface CredencialGuardada {
  /** Correo en minúsculas: es con lo que el médico se identifica. */
  correo: string;
  /**
   * Perfil completo tal como lo devolvió el backend en el último login.
   *
   * Se guarda junto a la credencial y no solo en el Store_Sesion porque cerrar
   * sesión borra el store: sin esto, un médico que cierra sesión y se queda sin
   * red podría acertar la contraseña y aun así no tener rol ni nombre con los
   * que abrir la aplicación.
   */
  perfil: Usuario;
  salBase64: string;
  hashBase64: string;
  iteraciones: number;
  /** Último login en línea verificado de verdad contra el backend. */
  verificadaEn: number;
}

// ---------------------------------------------------------------------------
// Utilidades de codificación
// ---------------------------------------------------------------------------

function aBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function desdeBase64(texto: string): Uint8Array {
  return Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));
}

// ---------------------------------------------------------------------------
// Derivación
// ---------------------------------------------------------------------------

async function derivar(
  contrasena: string,
  sal: Uint8Array,
  iteraciones: number
): Promise<ArrayBuffer> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(contrasena),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: sal as BufferSource,
      iterations: iteraciones,
      hash: "SHA-256",
    },
    material,
    LONGITUD_HASH * 8
  );
}

/**
 * Comparación en tiempo constante.
 *
 * Salir en el primer byte distinto filtra, por el tiempo que tarda, cuántos
 * bytes del hash se acertaron, y eso permite reconstruirlo a ciegas. Aquí se
 * recorren siempre los dos completos.
 */
function igualesEnTiempoConstante(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a[i]! ^ b[i]!;
  return diferencia === 0;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Guarda la credencial tras un login en línea exitoso. Es el único momento en
 * que se tiene a la vez la contraseña en claro y la certeza de que es correcta.
 */
export async function recordarCredencial(
  correo: string,
  contrasena: string,
  perfil: Usuario
): Promise<void> {
  try {
    const sal = crypto.getRandomValues(new Uint8Array(LONGITUD_SAL));
    const hash = await derivar(contrasena, sal, ITERACIONES);

    const credencial: CredencialGuardada = {
      correo: correo.trim().toLowerCase(),
      perfil,
      salBase64: aBase64(sal.buffer as ArrayBuffer),
      hashBase64: aBase64(hash),
      iteraciones: ITERACIONES,
      verificadaEn: Date.now(),
    };

    localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(credencial));
  } catch {
    // Sin WebCrypto (contexto no seguro) o sin almacenamiento: se pierde la
    // posibilidad de entrar sin red, pero el login en línea sigue intacto.
  }
}

function leerCredencial(): CredencialGuardada | null {
  try {
    const bruto = localStorage.getItem(CLAVE_ALMACEN);
    return bruto ? (JSON.parse(bruto) as CredencialGuardada) : null;
  } catch {
    return null;
  }
}

/** Si este equipo tiene una credencial guardada, y de quién. */
export function correoRecordado(): string | null {
  return leerCredencial()?.correo ?? null;
}

export interface ResultadoOffline {
  ok: boolean;
  /** Perfil con el que abrir la sesión local, si la verificación pasó. */
  perfil?: Usuario;
  /** Motivo del rechazo, listo para mostrar. */
  motivo?: string;
}

/**
 * Verifica correo y contraseña contra la credencial guardada en el equipo.
 *
 * El mensaje de rechazo distingue "aquí nunca entraste" de "la contraseña no
 * coincide" a propósito: son dos problemas con soluciones muy distintas —
 * conectarse una vez, o recordar la clave— y confundirlos deja al médico
 * probando lo que no es delante de un paciente.
 */
export async function verificarOffline(
  correo: string,
  contrasena: string
): Promise<ResultadoOffline> {
  const credencial = leerCredencial();
  if (!credencial) {
    return {
      ok: false,
      motivo:
        "Este equipo no tiene ninguna sesión guardada. Hay que iniciar sesión con conexión al menos una vez antes de poder entrar sin red.",
    };
  }

  if (credencial.correo !== correo.trim().toLowerCase()) {
    return {
      ok: false,
      motivo: `Sin conexión solo puede entrar el último usuario que inició sesión en este equipo (${credencial.correo}).`,
    };
  }

  try {
    const sal = desdeBase64(credencial.salBase64);
    const hash = await derivar(contrasena, sal, credencial.iteraciones);

    if (!igualesEnTiempoConstante(new Uint8Array(hash), desdeBase64(credencial.hashBase64))) {
      return { ok: false, motivo: "Contraseña incorrecta." };
    }

    return { ok: true, perfil: credencial.perfil };
  } catch {
    return {
      ok: false,
      motivo: "No se pudo verificar la contraseña en este equipo.",
    };
  }
}

/**
 * Borra la credencial guardada.
 *
 * No se llama al cerrar sesión: cerrar sesión es "salgo por ahora", y si eso
 * borrara la credencial, el médico que sale y se queda sin red no podría volver
 * a entrar — justo lo que esta función existe para evitar. Se reserva para un
 * "olvidar este equipo" explícito.
 */
export function olvidarCredencial(): void {
  try {
    localStorage.removeItem(CLAVE_ALMACEN);
  } catch {
    // nada que hacer
  }
}
