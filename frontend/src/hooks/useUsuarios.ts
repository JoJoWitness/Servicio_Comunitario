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
  type CrearUsuarioInput,
  type EditarUsuarioInput,
} from "../api/endpoints/usuarios";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const usuarioKeys = {
  all: ["usuarios"] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Lista todos los usuarios.
 * Usado por el módulo de administración (Req 28.1) y el selector de equipo
 * quirúrgico (Req 16.1).
 */
export function useListarUsuarios() {
  return useQuery({
    queryKey: usuarioKeys.all,
    queryFn: listarUsuarios,
    staleTime: 2 * 60 * 1000, // 2 min
  });
}

/**
 * Crea un usuario nuevo (admin).
 * Requisito 28.2 — POST /usuarios
 */
export function useCrearUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CrearUsuarioInput) => crearUsuario(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: usuarioKeys.all }),
  });
}

/**
 * Edita los datos o el rol de un usuario.
 * Requisitos 28.3, 28.5 — PUT /usuarios/{id}
 */
export function useEditarUsuario(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: EditarUsuarioInput) => editarUsuario(id, datos),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: usuarioKeys.all }),
  });
}

/**
 * Desactiva (baja lógica) un usuario.
 * Requisito 28.4 — DELETE /usuarios/{id}
 */
export function useDesactivarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => desactivarUsuario(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: usuarioKeys.all }),
  });
}
