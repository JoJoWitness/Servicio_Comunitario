/**
 * Hooks de TanStack Query para el módulo de Pacientes.
 *
 * Requisitos: 10.1, 11.5, 12.1, 13.2, 13.3
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  crearPaciente,
  darDeBajaPaciente,
  editarPaciente,
  listarPacientes,
  obtenerPaciente,
} from "../api/endpoints/pacientes";
import type { Paciente } from "../domain/models";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const pacienteKeys = {
  all: ["pacientes"] as const,
  detail: (id: string) => ["pacientes", id] as const,
};

// ---------------------------------------------------------------------------
// Hooks de lectura
// ---------------------------------------------------------------------------

/**
 * Obtiene todos los pacientes.
 * Requisito 10.1 — GET /pacientes
 *
 * El filtrado local por término de búsqueda se realiza en el componente
 * usando `filtrarPacientes` de `lib/search.ts`.
 */
export function useListarPacientes() {
  return useQuery({
    queryKey: pacienteKeys.all,
    queryFn: listarPacientes,
    staleTime: 5 * 60 * 1000, // 5 min — los pacientes no cambian frecuentemente
  });
}

/**
 * Obtiene un paciente por id.
 * Requisito 12.1 — GET /pacientes/{id}
 *
 * ATENCIÓN: el backend responde 500 si el paciente no existe (Req 12.6).
 * El componente consumidor debe manejar `ApiError` con status 500.
 */
export function useObtenerPaciente(id: string) {
  return useQuery({
    queryKey: pacienteKeys.detail(id),
    queryFn: () => obtenerPaciente(id),
    enabled: !!id,
    retry: false, // No reintentar ante 500 de paciente inexistente
  });
}

// ---------------------------------------------------------------------------
// Hooks de mutación
// ---------------------------------------------------------------------------

/**
 * Crea un paciente nuevo.
 * Requisito 11.5 — POST /pacientes (sin campo `id`)
 *
 * En éxito: invalida el listado de pacientes.
 */
export function useCrearPaciente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paciente: Paciente) => crearPaciente(paciente),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pacienteKeys.all });
    },
  });
}

/**
 * Edita un paciente existente.
 * Requisito 13.2 — PUT /pacientes/{id} (sin campo `id` en body)
 *
 * En éxito: invalida el listado y el detalle del paciente editado.
 */
export function useEditarPaciente(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paciente: Paciente) => editarPaciente(id, paciente),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pacienteKeys.all });
      queryClient.invalidateQueries({ queryKey: pacienteKeys.detail(id) });
    },
  });
}

/**
 * Da de baja lógica a un paciente (solo admin).
 * Requisito 13.3 — DELETE /pacientes/{id}
 *
 * En éxito: invalida el listado y elimina el detalle del caché.
 */
export function useDarDeBajaPaciente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => darDeBajaPaciente(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: pacienteKeys.all });
      queryClient.removeQueries({ queryKey: pacienteKeys.detail(id) });
    },
  });
}
