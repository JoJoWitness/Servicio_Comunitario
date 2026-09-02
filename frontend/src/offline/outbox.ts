/**
 * Cola de pendientes — lo que se redactó sin conexión y todavía no está en la
 * nube.
 *
 * Es el único lugar donde vive ese trabajo, así que se diseña con esa
 * responsabilidad en mente:
 *
 * - **Nada se borra sin confirmación del servidor.** Un ítem sale de la cola
 *   cuando `/sync` responde `creado` o `duplicado`. Si la respuesta se pierde,
 *   el ítem se queda y el siguiente intento recibirá `duplicado`: es preferible
 *   preguntar de más que perder una nota operatoria.
 * - **Un fallo no bloquea a los demás.** Cada ítem lleva su propio contador de
 *   intentos y su último error. Una nota con un dato inválido se queda en
 *   `error` para que el médico la corrija, mientras las otras suben.
 * - **El identificador lo pone el dispositivo.** `id` es un UUID generado aquí
 *   y es el mismo que viaja al servidor (`client_uuid` en las notas, el propio
 *   `id` en los pacientes). Eso es lo que hace que reintentar sea inofensivo.
 */

import type { Biopsia, Nota, Paciente } from "@/domain/models";
import { ALMACEN_PENDIENTES, borrar, guardar, leer, listar } from "./db";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type EstadoPendiente = "en-espera" | "subiendo" | "error";

interface Base {
  /** UUID generado en el dispositivo. Viaja al servidor y vuelve en la respuesta. */
  id: string;
  /**
   * Quién lo redactó.
   *
   * En el hospital la laptop del quirófano la usan varios médicos, y sin este
   * campo el siguiente en entrar vería en su panel las notas del anterior, con
   * el botón de descartar al lado. La cola es del dispositivo, pero cada ítem
   * tiene dueño y solo él lo ve y lo sube.
   */
  usuarioId: string;
  creadoEn: number;
  estado: EstadoPendiente;
  intentos: number;
  /** Último motivo de fallo, en el texto que devolvió el servidor. */
  error?: string;
}

export interface PacientePendiente extends Base {
  tipo: "paciente";
  datos: Paciente;
  /**
   * Foto de la cédula adjuntada mientras el paciente seguía en la cola. Sube
   * con él en el mismo lote de sincronización (`cedula_base64`): no puede ir
   * antes porque el paciente todavía no existe en el servidor, y no conviene
   * que vaya después porque habría que recordar hacerlo.
   */
  cedula?: { blob: Blob; contentType: string };
}

export interface NotaPendiente extends Base {
  tipo: "nota";
  datos: Nota;
  /** UUID del médico encargado. Se congela al encolar: la sesión puede cambiar. */
  medicoEncargadoId: string;
  /**
   * Id del paciente si también está en la cola. La nota no puede subir antes
   * que él, porque la llave foránea la rechazaría.
   */
  dependeDePaciente?: string;
}

export interface BiopsiaPendiente extends Base {
  tipo: "biopsia";
  datos: Biopsia;
  /** Nota de origen ya en el servidor. */
  notaId?: number;
  /**
   * Nota de origen que también está en la cola. La biopsia no puede subir
   * antes que ella: el servidor no tendría a qué vincularla.
   */
  notaClientUuid?: string;
}

export type Pendiente = PacientePendiente | NotaPendiente | BiopsiaPendiente;

// ---------------------------------------------------------------------------
// Identificadores
// ---------------------------------------------------------------------------

/**
 * UUID para un ítem nuevo. `crypto.randomUUID` está en toda WebView moderna
 * (y en la de Tauri), pero exige contexto seguro; el respaldo cubre el caso de
 * servir por HTTP plano en la red del hospital.
 */
export function nuevoId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Respaldo v4 con getRandomValues, que sí está disponible sin contexto seguro.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ---------------------------------------------------------------------------
// Operaciones
// ---------------------------------------------------------------------------

/** Mete una nota en la cola y devuelve el registro guardado. */
export async function encolarNota(
  nota: Nota,
  medicoEncargadoId: string,
  opciones: { id?: string; dependeDePaciente?: string; usuarioId?: string } = {}
): Promise<NotaPendiente> {
  const pendiente: NotaPendiente = {
    id: opciones.id ?? nuevoId(),
    // Quien está usando la aplicación puede no ser el encargado de la
    // operación: se registran notas de cirugías ajenas. El dueño de la cola es
    // quien la escribió, que es quien tendrá que subirla.
    usuarioId: opciones.usuarioId ?? medicoEncargadoId,
    tipo: "nota",
    datos: nota,
    medicoEncargadoId,
    dependeDePaciente: opciones.dependeDePaciente,
    creadoEn: Date.now(),
    estado: "en-espera",
    intentos: 0,
  };
  await guardar(ALMACEN_PENDIENTES, pendiente);
  return pendiente;
}

/**
 * Mete un paciente en la cola. A diferencia de la nota, el id no es un campo
 * aparte: es el UUID del propio paciente, el mismo con el que quedará
 * registrado en el servidor. Así la nota que ya lo referencia sigue apuntando
 * al lugar correcto sin tener que reescribirla al sincronizar.
 */
export async function encolarPaciente(
  paciente: Paciente,
  usuarioId: string
): Promise<PacientePendiente> {
  const id = paciente.id || nuevoId();
  const pendiente: PacientePendiente = {
    id,
    usuarioId,
    tipo: "paciente",
    datos: { ...paciente, id },
    creadoEn: Date.now(),
    estado: "en-espera",
    intentos: 0,
  };
  await guardar(ALMACEN_PENDIENTES, pendiente);
  return pendiente;
}

/** Mete una biopsia en la cola, ligada a su nota por id o por client_uuid. */
export async function encolarBiopsia(
  biopsia: Biopsia,
  usuarioId: string,
  vinculo: { notaId?: number; notaClientUuid?: string; id?: string }
): Promise<BiopsiaPendiente> {
  const pendiente: BiopsiaPendiente = {
    id: vinculo.id ?? nuevoId(),
    usuarioId,
    tipo: "biopsia",
    datos: biopsia,
    notaId: vinculo.notaId,
    notaClientUuid: vinculo.notaClientUuid,
    creadoEn: Date.now(),
    estado: "en-espera",
    intentos: 0,
  };
  await guardar(ALMACEN_PENDIENTES, pendiente);
  return pendiente;
}

/**
 * Los pendientes de un usuario, del más antiguo al más reciente.
 *
 * Se filtra siempre por dueño: en un equipo compartido, lo de cada médico es
 * suyo. Sin `usuarioId` no se devuelve nada, que es lo prudente cuando no se
 * sabe quién pregunta.
 */
export async function listarPendientes(usuarioId?: string): Promise<Pendiente[]> {
  if (!usuarioId) return [];
  const items = await listar<Pendiente>(ALMACEN_PENDIENTES);
  return items
    .filter((i) => i.usuarioId === usuarioId)
    .sort((a, b) => a.creadoEn - b.creadoEn);
}

export async function obtenerPendiente(id: string): Promise<Pendiente | undefined> {
  return leer<Pendiente>(ALMACEN_PENDIENTES, id);
}

/** Reemplaza los datos de un pendiente (corregir una nota antes de subirla). */
export async function actualizarPendiente(pendiente: Pendiente): Promise<void> {
  await guardar(ALMACEN_PENDIENTES, pendiente);
}

/** Marca el resultado de un intento fallido, conservando el ítem. */
export async function marcarError(id: string, motivo: string): Promise<void> {
  const item = await obtenerPendiente(id);
  if (!item) return;
  await guardar(ALMACEN_PENDIENTES, {
    ...item,
    estado: "error" as const,
    intentos: item.intentos + 1,
    error: motivo,
  });
}

/** Devuelve un ítem en error a la cola normal, para volver a intentarlo. */
export async function reintentar(id: string): Promise<void> {
  const item = await obtenerPendiente(id);
  if (!item) return;
  await guardar(ALMACEN_PENDIENTES, {
    ...item,
    estado: "en-espera" as const,
    error: undefined,
  });
}

/**
 * Saca un ítem de la cola. Solo debe llamarse cuando el servidor confirmó que
 * lo tiene, o cuando el médico decide descartarlo a sabiendas.
 */
export async function quitarPendiente(id: string): Promise<void> {
  await borrar(ALMACEN_PENDIENTES, id);
}

/** Cuántos pendientes tiene ese usuario, para el indicador de la barra. */
export async function contarPendientes(usuarioId?: string): Promise<number> {
  return (await listarPendientes(usuarioId)).length;
}
