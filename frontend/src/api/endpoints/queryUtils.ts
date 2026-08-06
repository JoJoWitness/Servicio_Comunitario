/**
 * Utilidades para construir query strings de paginación, ordenamiento y filtros.
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

/**
 * Construye un query string combinando filtros y parámetros de paginación.
 * Omite cualquier clave con valor undefined, null o cadena vacía.
 */
export function buildFilterQuery(
  filters?: Record<string, string | number | undefined>,
  pagination?: PaginationParams
): string {
  const qs = new URLSearchParams();

  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== "") {
        qs.set(key, String(value));
      }
    }
  }

  if (pagination) {
    if (pagination.page !== undefined) qs.set("page", String(pagination.page));
    if (pagination.size !== undefined) qs.set("size", String(pagination.size));
    if (pagination.sortBy) qs.set("sortBy", pagination.sortBy);
    if (pagination.order) qs.set("order", pagination.order);
  }

  const str = qs.toString();
  return str ? `?${str}` : "";
}
