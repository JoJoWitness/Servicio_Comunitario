/**
 * Utilidades para construir query strings de paginación y ordenamiento.
 */

import type { PaginationParams } from "../types";

/**
 * Construye el query string de paginación a partir de los parámetros.
 * Solo incluye los parámetros presentes (no añade defaults vacíos).
 */
export function buildPaginationQuery(params?: PaginationParams): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.size !== undefined) qs.set("size", String(params.size));
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.order) qs.set("order", params.order);
  const str = qs.toString();
  return str ? `?${str}` : "";
}
