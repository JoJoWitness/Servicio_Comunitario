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
import type { PaginationParams } from "../api/types";
import type { Paciente } from "../domain/models";

export const pacienteKeys = {
  all: (params?: PaginationParams) => ["pacientes", params ?? {}] as const,
  detail: (id: string) => ["pacientes", id] as const,
};

/**
 * Obtiene los pacientes paginados desde el servidor.
 * Requisito 10.1 — GET /pacientes?page=&size=&sortBy=&order=
 *
 * La queryKey incluye los params para que TanStack Query haga refetch
 * automático al cambiar de página o criterio de ordenamiento.
 */
export function useListarPacientes(params?: PaginationParams) {
  return useQuery({
    queryKey: pacienteKeys.all(params),
    queryFn: () => listarPacientes(params),
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
