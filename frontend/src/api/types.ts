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

// ---------------------------------------------------------------------------
// Filtros de búsqueda server-side por entidad
// ---------------------------------------------------------------------------

/** Filtros para GET /pacientes */
export interface FiltrosPacientesParams {
  nombre?: string;
  documento?: string;
  historia_medica?: string;
  genero?: string;
}

/** Filtros para GET /usuarios */
export interface FiltrosUsuariosParams {
  nombre?: string;
  correo?: string;
  rol?: string;
}
