/**
 * Ordenamiento de listados de notas.
 *
 * Requisito 12.3 / 18.2: El historial y el listado de notas se muestran
 * de la más reciente a la más antigua (fecha descendente).
 *
 * La función devuelve una **nueva** lista (no muta la original), lo que
 * garantiza que el resultado es una permutación exacta de la entrada.
 */

import type { Nota } from "../domain/models";

// ---------------------------------------------------------------------------
// Ordenamiento de notas por fecha descendente
// ---------------------------------------------------------------------------

/**
 * Ordena un array de notas de la más reciente a la más antigua,
 * comparando por `fechaComienzo`.
 *
 * No muta el array original; devuelve una nueva copia ordenada.
 *
 * @param notas - Lista de notas a ordenar
 * @returns Nueva lista ordenada por `fechaComienzo` descendente
 *
 * @example
 * ordenarNotasDesc([notaVieja, notaNueva]) // [notaNueva, notaVieja]
 */
export function ordenarNotasDesc(notas: Nota[]): Nota[] {
  return [...notas].sort(
    (a, b) => b.fechaComienzo.getTime() - a.fechaComienzo.getTime()
  );
}
