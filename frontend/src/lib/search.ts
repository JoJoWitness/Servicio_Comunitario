/**
 * Filtro local de pacientes.
 *
 * El backend no expone búsqueda de pacientes en servidor (Requisito 10.2),
 * por lo que el frontend obtiene todos los pacientes y filtra localmente.
 *
 * Requisito 10.5: Los pacientes marcados como eliminados se excluyen del listado.
 */

import type { Paciente } from "../domain/models";

// ---------------------------------------------------------------------------
// Normalización para búsqueda case-insensitive
// ---------------------------------------------------------------------------

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // elimina tildes/diacríticos
}

// ---------------------------------------------------------------------------
// Filtro principal
// ---------------------------------------------------------------------------

/**
 * Filtra la lista de pacientes por un término de búsqueda sobre:
 * - nombre
 * - número de identificación
 * - historia médica
 *
 * La búsqueda es insensible a mayúsculas y diacríticos (tildes).
 * Siempre excluye pacientes marcados como `eliminado = true`.
 *
 * Si `termino` está vacío, devuelve todos los pacientes no eliminados.
 *
 * Requisito 10.2: filtrar localmente por nombre, número de identificación o
 * historia médica.
 * Requisito 10.5: excluir pacientes eliminados.
 *
 * @param pacientes - Lista completa de pacientes
 * @param termino - Término de búsqueda ingresado por el usuario
 * @returns Lista filtrada (nunca incluye eliminados)
 *
 * @example
 * filtrarPacientes(lista, "garcia")  // coincide por nombre
 * filtrarPacientes(lista, "HC-001") // coincide por historia médica
 * filtrarPacientes(lista, "")       // devuelve todos los no eliminados
 */
export function filtrarPacientes(
  pacientes: Paciente[],
  termino: string
): Paciente[] {
  const activos = pacientes.filter((p) => !p.eliminado);

  const terminoNorm = normalizar(termino.trim());
  if (!terminoNorm) {
    return activos;
  }

  return activos.filter((p) => {
    return (
      normalizar(p.nombre).includes(terminoNorm) ||
      normalizar(p.numeroIdentificacion).includes(terminoNorm) ||
      normalizar(p.historiaMedica).includes(terminoNorm)
    );
  });
}
