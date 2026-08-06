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
import type { FiltrosPacientesParams, PaginationParams } from "../api/types";
import type { Paciente } from "../domain/models";

export const pacienteKeys = {
  all: (filtros?: FiltrosPacientesParams, params?: PaginationParams) =>
    ["pacientes", filtros ?? {}, params ?? {}] as const,
  detail: (id: string) => ["pacientes", id] as const,
};

/**
 * Obtiene los pacientes paginados desde el servidor con filtros opcionales.
 * Requisito 10.1 — GET /pacientes?nombre=&documento=&historia_medica=&genero=&page=&size=&sortBy=&order=
 *
 * La queryKey incluye filtros y params para que TanStack Query haga refetch
 * automático al cambiar cualquiera de ellos.
 */
export function useListarPacientes(
  filtros?: FiltrosPacientesParams,
  params?: PaginationParams
) {
  return useQuery({
    queryKey: pacienteKeys.all(filtros, params),
    queryFn: () => listarPacientes(filtros, params),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev, // evita parpadeo al cambiar página
  });
}

export function useObtenerPaciente(id: string) {
  return useQuery({
    queryKey: pacienteKeys.detail(id),
    queryFn: () => obtenerPaciente(id),
    enabled: !!id,
    retry: false,
  });
}

export function useCrearPaciente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paciente: Paciente) => crearPaciente(paciente),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pacientes"] }),
  });
}

export function useEditarPaciente(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paciente: Paciente) => editarPaciente(id, paciente),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      queryClient.invalidateQueries({ queryKey: pacienteKeys.detail(id) });
    },
  });
}

export function useDarDeBajaPaciente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => darDeBajaPaciente(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      queryClient.removeQueries({ queryKey: pacienteKeys.detail(id) });
    },
  });
}
