/**
 * Espejo local — la copia de lo último que se leyó del servidor.
 *
 * Una nota operatoria no se escribe en el vacío: hace falta el catálogo de
 * diagnósticos, procedimientos y técnicas para redactar el resumen, la lista de
 * pacientes para saber a quién se operó y la de médicos para armar el equipo.
 * Sin conexión, nada de eso está disponible... salvo que se haya guardado
 * antes. Eso es este módulo.
 *
 * La regla es simple: cada lectura que sale bien se guarda; cada lectura que
 * falla por red se responde con lo guardado. Los catálogos y las notas pasan
 * por `conEspejo`; las listas completas de médicos y pacientes las escriben
 * `todosLosUsuarios` y `todosLosPacientes`, que recorren todas las páginas —una
 * página suelta de 20 dejaría el espejo peor de lo que estaba—. `precarga.ts`
 * lo baja todo por adelantado en cuanto hay sesión y servidor.
 *
 * Dos consecuencias que conviene tener presentes:
 *
 * - **Los datos pueden estar viejos.** Un paciente registrado hoy por otro
 *   médico no aparecerá hasta la próxima sincronización. Por eso cada entrada
 *   guarda `guardadoEn`: la interfaz puede decir "datos del martes" en vez de
 *   fingir que están al día.
 * - **Solo se puede trabajar sin red sobre lo que ya se visitó.** Un equipo
 *   recién instalado no tiene espejo. La aplicación avisa de eso al entrar
 *   (ver `hayEspejo`) para que el médico abra las pantallas estando en línea
 *   antes de irse a un sitio sin señal.
 */

import { isRedError } from "@/api/errors";
import { ALMACEN_ESPEJO, guardar, leer } from "./db";

/** Cada colección que se refleja. La clave es literal para poder versionarla. */
export type ClaveEspejo =
  | "catalogo:diagnosticos"
  | "catalogo:procedimientos"
  | "catalogo:tecnicas"
  | "pacientes"
  | "medicos"
  | "mis-notas";

interface EntradaEspejo<T> {
  clave: ClaveEspejo;
  datos: T;
  guardadoEn: number;
}

/** Deja constancia de lo leído. Nunca lanza: fallar al cachear no es fallar. */
export async function reflejar<T>(clave: ClaveEspejo, datos: T): Promise<void> {
  try {
    const entrada: EntradaEspejo<T> = { clave, datos, guardadoEn: Date.now() };
    await guardar(ALMACEN_ESPEJO, entrada);
  } catch {
    // Cuota llena o almacenamiento bloqueado. Se sigue trabajando en línea.
  }
}

/** Devuelve lo reflejado, o `undefined` si esa colección nunca se leyó aquí. */
export async function reflejado<T>(clave: ClaveEspejo): Promise<T | undefined> {
  try {
    const entrada = await leer<EntradaEspejo<T>>(ALMACEN_ESPEJO, clave);
    return entrada?.datos;
  } catch {
    return undefined;
  }
}

/** Lista reflejada, o null si nunca se guardó o quedó en un formato anterior. */
export async function listaReflejada<T>(clave: ClaveEspejo): Promise<T[] | null> {
  const datos = await reflejado<unknown>(clave);
  return Array.isArray(datos) ? (datos as T[]) : null;
}

/** Cuándo se guardó por última vez esa colección, para poder mostrar su antigüedad. */
export async function reflejadoEn(clave: ClaveEspejo): Promise<number | null> {
  try {
    const entrada = await leer<EntradaEspejo<unknown>>(ALMACEN_ESPEJO, clave);
    return entrada?.guardadoEn ?? null;
  } catch {
    return null;
  }
}

/**
 * Envuelve una lectura de la API con el espejo. Es el único punto donde se
 * decide entre servidor y copia local, para que los endpoints no repitan la
 * misma condición diez veces.
 *
 * Solo cubre el fallo de red. Un 401 o un 403 se dejan pasar tal cual: la
 * sesión expirada tiene que llevar al login, no servirse en silencio de una
 * copia vieja como si nada hubiera pasado.
 *
 * @param clave  - Colección a la que pertenece la lectura
 * @param cargar - La llamada real a la API
 */
export async function conEspejo<T>(
  clave: ClaveEspejo,
  cargar: () => Promise<T>
): Promise<T> {
  try {
    const datos = await cargar();
    // Sin await: el guardado no debe demorar la pantalla.
    void reflejar(clave, datos);
    return datos;
  } catch (error) {
    if (!isRedError(error)) throw error;

    const copia = await reflejado<T>(clave);
    if (copia !== undefined) return copia;

    // Sin red y sin copia no hay nada que mostrar. El error viaja para que la
    // pantalla explique que hay que conectarse al menos una vez.
    throw error;
  }
}

/**
 * Indica si el dispositivo tiene lo mínimo para redactar una nota sin conexión:
 * el catálogo clínico. Sin él, el formulario queda sin diagnósticos ni
 * procedimientos que ofrecer y no hay nota que escribir.
 */
export async function hayEspejo(): Promise<boolean> {
  const diagnosticos = await reflejado<unknown[]>("catalogo:diagnosticos");
  const procedimientos = await reflejado<unknown[]>("catalogo:procedimientos");
  return Boolean(diagnosticos?.length && procedimientos?.length);
}
