/**
 * Utilidades para construir y derivar el equipo quirúrgico.
 *
 * El backend maneja el equipo de dos formas distintas (Requisitos 16.3–16.6):
 *
 * - **Escritura** (POST/PUT): campo `equipo` → string[] de UUIDs,
 *   excluyendo al médico encargado (el backend lo agrega automáticamente).
 *
 * - **Lectura** (GET): campo `medicos` → array de objetos Usuario completos.
 *   Al editar una nota existente, se reconstruye `equipo` a partir de `medicos[].id`.
 */

import type { Usuario } from "../domain/models";

// ---------------------------------------------------------------------------
// Construcción del campo `equipo` para envío al backend
// ---------------------------------------------------------------------------

/**
 * Construye el array `equipo` para enviar al backend en POST/PUT.
 *
 * Excluye al médico encargado del array de seleccionados, ya que el backend
 * lo agrega automáticamente. Elimina duplicados.
 *
 * Requisito 16.4: El campo `equipo` no debe incluir al médico encargado.
 *
 * @param seleccionados - UUIDs de los médicos seleccionados en el formulario
 * @param medicoEncargadoId - UUID del médico encargado de la nota
 * @returns Array de UUIDs sin el encargado y sin duplicados
 *
 * @example
 * construirEquipo(["uuid-a", "uuid-b", "uuid-enc"], "uuid-enc")
 * // ["uuid-a", "uuid-b"]
 */
export function construirEquipo(
  seleccionados: string[],
  medicoEncargadoId: string
): string[] {
  const vistos = new Set<string>();
  const resultado: string[] = [];

  for (const id of seleccionados) {
    if (id !== medicoEncargadoId && !vistos.has(id)) {
      vistos.add(id);
      resultado.push(id);
    }
  }

  return resultado;
}

// ---------------------------------------------------------------------------
// Derivación del campo `equipo` al editar una nota existente
// ---------------------------------------------------------------------------

/**
 * Deriva el array de UUIDs `equipo` a partir del campo `medicos` recibido
 * del backend en lectura.
 *
 * Usado al cargar una nota existente para pre-poblar el selector de equipo
 * en el formulario de edición.
 *
 * Requisito 16.5: Al editar, precargar el selector a partir de `medicos[]`.
 * Requisito 16.6: Construir `equipo` mapeando `medicos[].id` para preservar
 * el equipo, dado que el backend reemplaza el equipo completo en cada PUT.
 *
 * @param medicos - Array de objetos Usuario del campo `medicos` del backend
 * @returns Array de UUIDs correspondiente
 *
 * @example
 * derivarEquipoDesdeMedicos([{ id: "uuid-a", ... }, { id: "uuid-b", ... }])
 * // ["uuid-a", "uuid-b"]
 */
export function derivarEquipoDesdeMedicos(medicos: Usuario[]): string[] {
  return medicos.map((u) => u.id);
}
