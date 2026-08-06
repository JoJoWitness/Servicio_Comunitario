/**
 * Hooks de TanStack Query para los catálogos clínicos.
 *
 * Requisitos: 17.1, 27.2, 27.3, 27.4, 27.5
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  crearDiagnostico,
  crearProcedimiento,
  crearTecnica,
  editarDiagnostico,
  editarProcedimiento,
  editarTecnica,
  eliminarDiagnostico,
  eliminarProcedimiento,
  eliminarTecnica,
  listarDiagnosticos,
  listarProcedimientos,
  listarTecnicas,
} from "../api/endpoints/catalogos";
import type { Diagnostico, Procedimiento, Tecnica } from "../domain/models";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const catalogoKeys = {
  diagnosticos: ["diagnosticos"] as const,
  procedimientos: ["procedimientos"] as const,
  tecnicas: ["tecnicas"] as const,
};

// ---------------------------------------------------------------------------
// Hooks de lectura (para autocompletado y administración)
// ---------------------------------------------------------------------------

/** GET /diagnosticos — Requisito 17.1 */
export function useDiagnosticos() {
  return useQuery({
    queryKey: catalogoKeys.diagnosticos,
    queryFn: listarDiagnosticos,
    staleTime: 10 * 60 * 1000, // 10 min — los catálogos cambian poco
  });
}

/** GET /procedimientos — Requisito 17.1 */
export function useProcedimientos() {
  return useQuery({
    queryKey: catalogoKeys.procedimientos,
    queryFn: listarProcedimientos,
    staleTime: 10 * 60 * 1000,
  });
}

/** GET /tecnicas — Requisito 17.1 */
export function useTecnicas() {
  return useQuery({
    queryKey: catalogoKeys.tecnicas,
    queryFn: listarTecnicas,
    staleTime: 10 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Hooks de mutación — Diagnósticos
// ---------------------------------------------------------------------------

export function useCrearDiagnostico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (d: Omit<Diagnostico, "id">) => crearDiagnostico(d),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: catalogoKeys.diagnosticos }),
  });
}

export function useEditarDiagnostico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: Omit<Diagnostico, "id"> }) =>
      editarDiagnostico(id, datos),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: catalogoKeys.diagnosticos }),
  });
}

export function useEliminarDiagnostico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => eliminarDiagnostico(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: catalogoKeys.diagnosticos }),
  });
}

// ---------------------------------------------------------------------------
// Hooks de mutación — Procedimientos
// ---------------------------------------------------------------------------

export function useCrearProcedimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (p: Omit<Procedimiento, "id">) => crearProcedimiento(p),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: catalogoKeys.procedimientos }),
  });
}

export function useEditarProcedimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: Omit<Procedimiento, "id"> }) =>
      editarProcedimiento(id, datos),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: catalogoKeys.procedimientos }),
  });
}

export function useEliminarProcedimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => eliminarProcedimiento(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: catalogoKeys.procedimientos }),
  });
}

// ---------------------------------------------------------------------------
// Hooks de mutación — Técnicas
// ---------------------------------------------------------------------------

export function useCrearTecnica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (t: Omit<Tecnica, "id">) => crearTecnica(t),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: catalogoKeys.tecnicas }),
  });
}

export function useEditarTecnica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: Omit<Tecnica, "id"> }) =>
      editarTecnica(id, datos),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: catalogoKeys.tecnicas }),
  });
}

export function useEliminarTecnica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => eliminarTecnica(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: catalogoKeys.tecnicas }),
  });
}
