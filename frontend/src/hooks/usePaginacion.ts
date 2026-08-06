/**
 * Hook de paginación.
 *
 * Soporta dos modos:
 * - Client-side: recibe el array completo y hace el slice localmente.
 * - Server-side: recibe la metadata del backend (totalItems, totalPages).
 *
 * Para paginación server-side, pasar `serverMeta` y usar solo los controles
 * (página, siguiente, anterior) — el slice lo hace el backend.
 */

import { useState } from "react";
import type { PaginatedMeta } from "@/api/types";

const DEFAULT_POR_PAGINA = 10;

// ---------------------------------------------------------------------------
// Client-side
// ---------------------------------------------------------------------------

export function usePaginacion<T>(items: T[], porPagina = DEFAULT_POR_PAGINA) {
  const [pagina, setPagina] = useState(1);

  const total = items.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const paginaAjustada = Math.min(pagina, totalPaginas);

  const inicio = (paginaAjustada - 1) * porPagina;
  const itemsPagina = items.slice(inicio, inicio + porPagina);

  const irA = (n: number) => setPagina(Math.max(1, Math.min(n, totalPaginas)));

  return {
    itemsPagina,
    pagina: paginaAjustada,
    totalPaginas,
    total,
    haySiguiente: paginaAjustada < totalPaginas,
    hayAnterior: paginaAjustada > 1,
    siguiente: () => irA(paginaAjustada + 1),
    anterior: () => irA(paginaAjustada - 1),
    resetear: () => setPagina(1),
  };
}

// ---------------------------------------------------------------------------
// Server-side
// ---------------------------------------------------------------------------

export interface ServerPaginacionState {
  pagina: number;
  size: number;
  sortBy: string;
  order: "ASC" | "DESC";
}

export interface ServerPaginacionControls extends ServerPaginacionState {
  totalPaginas: number;
  total: number;
  haySiguiente: boolean;
  hayAnterior: boolean;
  siguiente: () => void;
  anterior: () => void;
  setSortBy: (col: string) => void;
  setOrder: (o: "ASC" | "DESC") => void;
  resetear: () => void;
}

export function useServerPaginacion(
  initialSortBy = "",
  initialOrder: "ASC" | "DESC" = "DESC",
  initialSize = DEFAULT_POR_PAGINA
): ServerPaginacionControls & { setMeta: (meta: PaginatedMeta) => void } {
  const [pagina, setPagina] = useState(1);
  const [size] = useState(initialSize);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [order, setOrder] = useState<"ASC" | "DESC">(initialOrder);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const setMeta = (meta: PaginatedMeta) => {
    setTotal(meta.totalItems);
    setTotalPaginas(meta.totalPages);
  };

  const irA = (n: number) => setPagina(Math.max(1, Math.min(n, totalPaginas)));

  return {
    pagina,
    size,
    sortBy,
    order,
    total,
    totalPaginas,
    haySiguiente: pagina < totalPaginas,
    hayAnterior: pagina > 1,
    siguiente: () => irA(pagina + 1),
    anterior: () => irA(pagina - 1),
    setSortBy: (col: string) => { setSortBy(col); setPagina(1); },
    setOrder: (o) => { setOrder(o); setPagina(1); },
    resetear: () => setPagina(1),
    setMeta,
  };
}
