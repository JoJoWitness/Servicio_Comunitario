/**
 * Utilidades para construir query strings de paginación, ordenamiento y filtros.
 */

import type { PaginatedResponse, PaginationParams } from "../types";

/** Máximo que acepta el backend; pedir más hace que caiga al default de 20. */
export const TAMANO_PAGINA_MAX = 100;

/** Pagina una lista completa en memoria. Se usa al servir del espejo. */
export function paginarEnLocal<T>(
  items: T[],
  params?: PaginationParams
): PaginatedResponse<T> {
  const size = params?.size && params.size > 0 ? params.size : Math.max(items.length, 1);
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(Math.max(params?.page ?? 1, 1), totalPages);
  const inicio = (page - 1) * size;

  return {
    data: items.slice(inicio, inicio + size),
    meta: {
      totalItems: items.length,
      totalPages,
      currentPage: page,
      pageSize: size,
    },
  };
}

/** Coincidencia sin distinguir mayúsculas ni acentos. */
export function coincide(texto: string | undefined, aguja: string): boolean {
  const normalizar = (s: string) =>
    s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return normalizar(texto ?? "").includes(normalizar(aguja));
}

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
