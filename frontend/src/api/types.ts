/**
 * Tipos compartidos de la capa de API.
 */

// ---------------------------------------------------------------------------
// Respuesta paginada — estructura que devuelven los listados server-side
// ---------------------------------------------------------------------------

export interface PaginatedMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

// ---------------------------------------------------------------------------
// Parámetros de paginación y ordenamiento
// ---------------------------------------------------------------------------

export interface PaginationParams {
  page?: number;
  size?: number;
  sortBy?: string;
  order?: "ASC" | "DESC";
}
