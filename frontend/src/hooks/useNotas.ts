/**
 * Hooks de TanStack Query para el módulo de Notas Operatorias.
 *
 * La invalidación de caché en mutaciones es crítica para que los listados
 * reflejen inmediatamente los cambios (Requisitos 14.7, 21.5, 23.3).
 *
 * Requisitos: 12.2, 12.5, 14.6, 14.7, 18.1, 18.4, 19.1, 19.2, 20.1,
 *             21.2, 21.5, 23.2, 23.3
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  crearNota,
  editarNota,
  eliminarNota,
  misNotas,
  notasDePaciente,
  obtenerNota,
  todasLasNotas,
} from "../api/endpoints/notas";
import type { FiltrosNota, Nota, RangoFechas } from "../domain/models";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const notaKeys = {
  misNotas: (rango?: RangoFechas) => ["misNotas", rango ?? null] as const,
  todasNotas: (filtros?: FiltrosNota) => ["todasNotas", filtros ?? null] as const,
  detail: (id: number) => ["nota", id] as const,
  dePaciente: (pacienteId: string, rango?: RangoFechas) =>
    ["notasPaciente", pacienteId, rango ?? null] as const,
};

// ---------------------------------------------------------------------------
// Hooks de lectura
// ---------------------------------------------------------------------------

/**
 * Obtiene las notas del médico autenticado.
 * Requisitos 18.1, 18.4 — GET /notas/medics[/dates]
 */
export function useMisNotas(rango?: RangoFechas) {
  return useQuery({
    queryKey: notaKeys.misNotas(rango),
    queryFn: () => misNotas(rango),
  });
}

/**
 * Obtiene todas las notas del servicio con filtros opcionales.
 * Requisitos 19.1, 19.2 — GET /notas[?medico=&paciente=&from=&to=]
 */
export function useTodasLasNotas(filtros?: FiltrosNota) {
  return useQuery({
    queryKey: notaKeys.todasNotas(filtros),
    queryFn: () => todasLasNotas(filtros),
  });
}

/**
 * Obtiene el detalle de una nota.
 * Requisito 20.1 — GET /notas/{id}
 */
export function useObtenerNota(id: number) {
  return useQuery({
    queryKey: notaKeys.detail(id),
    queryFn: () => obtenerNota(id),
    enabled: !!id,
    retry: false, // No reintentar ante 404
  });
}

/**
 * Obtiene el historial de notas de un paciente.
 * Requisitos 12.2, 12.5 — GET /notas/pacientes/{id}[/dates]
 */
export function useNotasDePaciente(pacienteId: string, rango?: RangoFechas) {
  return useQuery({
    queryKey: notaKeys.dePaciente(pacienteId, rango),
    queryFn: () => notasDePaciente(pacienteId, rango),
    enabled: !!pacienteId,
  });
}

// ---------------------------------------------------------------------------
// Hooks de mutación
// ---------------------------------------------------------------------------

/**
 * Crea una nota operatoria nueva.
 * Requisitos 14.6, 14.7 — POST /notas
 *
 * En éxito: invalida "Mis notas" y "Todas las notas" para que aparezca
 * inmediatamente en ambos listados.
 */
export function useCrearNota() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      nota,
      medicoEncargadoId,
    }: {
      nota: Nota;
      medicoEncargadoId: string;
    }) => crearNota(nota, medicoEncargadoId),
    onSuccess: () => {
      // Requisito 14.7: invalidar caché de "Mis notas"
      queryClient.invalidateQueries({ queryKey: ["misNotas"] });
      queryClient.invalidateQueries({ queryKey: ["todasNotas"] });
    },
  });
}

/**
 * Edita una nota existente.
 * Requisitos 21.2, 21.5 — PUT /notas/{id}
 *
 * En éxito: invalida el detalle, "Mis notas", "Todas las notas" y el historial
 * del paciente para que todos los listados reflejen los cambios.
 */
export function useEditarNota(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      nota,
      medicoEncargadoId,
    }: {
      nota: Nota;
      medicoEncargadoId: string;
    }) => editarNota(id, nota, medicoEncargadoId),
    onSuccess: (notaActualizada) => {
      // Actualizar el detalle en caché directamente
      queryClient.setQueryData(notaKeys.detail(id), notaActualizada);
      // Requisito 21.5: invalidar listados afectados
      queryClient.invalidateQueries({ queryKey: ["misNotas"] });
      queryClient.invalidateQueries({ queryKey: ["todasNotas"] });
      queryClient.invalidateQueries({ queryKey: ["notasPaciente"] });
    },
  });
}

/**
 * Elimina una nota.
 * Requisitos 23.2, 23.3 — DELETE /notas/{id}
 *
 * En éxito: elimina el detalle del caché e invalida los listados.
 */
export function useEliminarNota() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => eliminarNota(id),
    onSuccess: (_data, id) => {
      // Requisito 23.3: invalidar caché de los listados afectados
      queryClient.removeQueries({ queryKey: notaKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["misNotas"] });
      queryClient.invalidateQueries({ queryKey: ["todasNotas"] });
      queryClient.invalidateQueries({ queryKey: ["notasPaciente"] });
    },
  });
}
