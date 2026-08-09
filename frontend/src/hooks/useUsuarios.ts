/**
 * Hooks de TanStack Query para el módulo de Usuarios.
 *
 * Requisitos: 16.1, 28.1, 28.2, 28.3, 28.4, 28.5
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  crearUsuario,
  desactivarUsuario,
  editarUsuario,
  listarUsuarios,
  todosLosUsuarios,
  type CrearUsuarioInput,
  type EditarUsuarioInput,
} from "../api/endpoints/usuarios";
import type { FiltrosUsuariosParams, PaginationParams } from "../api/types";

export const usuarioKeys = {
  all: (filtros?: FiltrosUsuariosParams, params?: PaginationParams) =>
    ["usuarios", filtros ?? {}, params ?? {}] as const,
  todos: ["usuarios", "todos"] as const,
};

/** Listado entero para el selector de equipo quirúrgico (Req 16.1). */
export function useTodosLosUsuarios() {
  return useQuery({
    queryKey: usuarioKeys.todos,
    queryFn: todosLosUsuarios,
    staleTime: 5 * 60 * 1000,
  });
}

export function useListarUsuarios(
  filtros?: FiltrosUsuariosParams,
  params?: PaginationParams
) {
  return useQuery({
    queryKey: usuarioKeys.all(filtros, params),
    queryFn: () => listarUsuarios(filtros, params),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useCrearUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CrearUsuarioInput) => crearUsuario(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

export function useEditarUsuario(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: EditarUsuarioInput) => editarUsuario(id, datos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

export function useDesactivarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => desactivarUsuario(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}
