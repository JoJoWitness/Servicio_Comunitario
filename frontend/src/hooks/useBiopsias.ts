/**
 * Hooks de TanStack Query para biopsias (PRD 0.5.0).
 *
 * Invalidaciones: cualquier cambio en una biopsia toca el listado de
 * seguimiento (`["biopsias"]`), la nota a la que está ligada (su tarjeta pide
 * `/notas/{id}/biopsias`, y vincular puede marcar `tuvo_biopsia`) y la ficha
 * del paciente.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  biopsiasDeNota,
  biopsiasDePaciente,
  crearBiopsia,
  desvincularBiopsia,
  editarBiopsia,
  eliminarBiopsia,
  listarBiopsias,
  obtenerBiopsia,
  vincularBiopsia,
} from "../api/endpoints/biopsias";
import { isApiError, isRedError } from "../api/errors";
import type { PaginationParams } from "../api/types";
import type { Biopsia, FiltrosBiopsia, RolVinculoBiopsia } from "../domain/models";
import { encolarBiopsia, nuevoId } from "../offline/outbox";
import { pendientesKey } from "../offline/useSincronizacion";
import { haySinConexion } from "../stores/conexionStore";
import { useSessionStore } from "../stores/sessionStore";
import { notaKeys } from "./useNotas";

export const biopsiaKeys = {
  lista: (filtros?: FiltrosBiopsia, paginacion?: PaginationParams) =>
    ["biopsias", "lista", filtros ?? null, paginacion ?? {}] as const,
  detail: (id: number) => ["biopsias", "detalle", id] as const,
  deNota: (notaId: number) => ["biopsias", "nota", notaId] as const,
  dePaciente: (pacienteId: string) => ["biopsias", "paciente", pacienteId] as const,
};

function invalidarTodo(queryClient: ReturnType<typeof useQueryClient>, notaIds: number[] = []) {
  queryClient.invalidateQueries({ queryKey: ["biopsias"] });
  for (const id of notaIds) {
    queryClient.invalidateQueries({ queryKey: notaKeys.detail(id) });
  }
  queryClient.invalidateQueries({ queryKey: ["misNotas"] });
  queryClient.invalidateQueries({ queryKey: ["todasNotas"] });
  queryClient.invalidateQueries({ queryKey: ["notasPaciente"] });
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

export function useBiopsias(
  filtros?: FiltrosBiopsia,
  paginacion?: PaginationParams,
  opciones: { reflejar?: boolean } = {}
) {
  return useQuery({
    queryKey: biopsiaKeys.lista(filtros, paginacion),
    queryFn: () => listarBiopsias(filtros, paginacion, opciones),
    placeholderData: (prev) => prev,
  });
}

export function useBiopsia(id: number) {
  return useQuery({
    queryKey: biopsiaKeys.detail(id),
    queryFn: () => obtenerBiopsia(id),
    enabled: !!id,
    retry: false,
  });
}

export function useBiopsiasDeNota(notaId: number) {
  return useQuery({
    queryKey: biopsiaKeys.deNota(notaId),
    queryFn: () => biopsiasDeNota(notaId),
    enabled: !!notaId,
  });
}

export function useBiopsiasDePaciente(pacienteId: string) {
  return useQuery({
    queryKey: biopsiaKeys.dePaciente(pacienteId),
    queryFn: () => biopsiasDePaciente(pacienteId),
    enabled: !!pacienteId,
  });
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

export type ResultadoBiopsia =
  | { estado: "subida"; biopsia: Biopsia }
  | { estado: "en-cola"; clientUuid: string };

/**
 * Registra una biopsia ligada a una nota.
 *
 * Si la nota todavía está en la cola (`notaClientUuid`), la biopsia va
 * directo a la cola detrás de ella: no hay a qué vincularla en el servidor.
 * Con `notaId` se intenta en línea y, si no hay red, también se encola.
 */
export function useCrearBiopsia() {
  const queryClient = useQueryClient();
  const usuarioId = useSessionStore((s) => s.perfil?.id);

  return useMutation<
    ResultadoBiopsia,
    unknown,
    { biopsia: Biopsia; notaId?: number; notaClientUuid?: string }
  >({
    mutationFn: async ({ biopsia, notaId, notaClientUuid }) => {
      const clientUuid = nuevoId();
      const encolar = async (): Promise<ResultadoBiopsia> => {
        if (!usuarioId) throw new Error("No hay sesión con la que registrar la biopsia.");
        await encolarBiopsia(biopsia, usuarioId, { id: clientUuid, notaId, notaClientUuid });
        return { estado: "en-cola", clientUuid };
      };

      if (notaClientUuid || haySinConexion()) return encolar();

      try {
        return {
          estado: "subida",
          biopsia: await crearBiopsia(biopsia, { notaId, clientUuid }),
        };
      } catch (error) {
        if (isRedError(error)) return encolar();
        // 409: la nota de origen no está aún en el servidor. Cola.
        if (isApiError(error) && error.status === 409) return encolar();
        throw error;
      }
    },
    onSuccess: (resultado, { notaId }) => {
      if (resultado.estado === "en-cola") {
        queryClient.invalidateQueries({ queryKey: pendientesKey });
        return;
      }
      invalidarTodo(queryClient, notaId ? [notaId] : []);
    },
  });
}

export function useEditarBiopsia(id: number) {
  const queryClient = useQueryClient();
  return useMutation<Biopsia, unknown, Biopsia>({
    mutationFn: (biopsia) => editarBiopsia(id, biopsia),
    onSuccess: (actualizada) => {
      queryClient.setQueryData(biopsiaKeys.detail(id), actualizada);
      invalidarTodo(queryClient, actualizada.notas.map((n) => n.idNota));
    },
  });
}

export function useEliminarBiopsia() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, Biopsia>({
    mutationFn: (biopsia) => eliminarBiopsia(biopsia.id!),
    onSuccess: (_d, biopsia) => {
      queryClient.removeQueries({ queryKey: biopsiaKeys.detail(biopsia.id!) });
      invalidarTodo(queryClient, biopsia.notas.map((n) => n.idNota));
    },
  });
}

export function useVincularBiopsia(notaId: number) {
  const queryClient = useQueryClient();
  return useMutation<Biopsia, unknown, { biopsiaId: number; rol?: RolVinculoBiopsia }>({
    mutationFn: ({ biopsiaId, rol }) => vincularBiopsia(notaId, biopsiaId, rol),
    onSuccess: () => invalidarTodo(queryClient, [notaId]),
  });
}

export function useDesvincularBiopsia(notaId: number) {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, number>({
    mutationFn: (biopsiaId) => desvincularBiopsia(notaId, biopsiaId),
    onSuccess: () => invalidarTodo(queryClient, [notaId]),
  });
}
