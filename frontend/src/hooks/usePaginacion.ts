/**
 * Hook de paginación del lado del cliente.
 * Recibe un array completo y devuelve la página actual recortada con los controles.
 */

import { useState } from "react";

const DEFAULT_POR_PAGINA = 10;

export function usePaginacion<T>(items: T[], porPagina = DEFAULT_POR_PAGINA) {
  const [pagina, setPagina] = useState(1);

  const total = items.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  // Ajustar si el array se reduce (ej. al filtrar)
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
    // Resetear a página 1 cuando cambia el filtro
    resetear: () => setPagina(1),
  };
}
