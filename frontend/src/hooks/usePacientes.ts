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
  todosLosPacientes,
} from "../api/endpoints/pacientes";
import type { FiltrosPacientesParams, PaginationParams } from "../api/types";
import { isRedError } from "../api/errors";
import type { Paciente } from "../domain/models";
import { encolarPaciente, nuevoId } from "../offline/outbox";
import { pendientesKey } from "../offline/useSincronizacion";
import { haySinConexion } from "../stores/conexionStore";
import { useSessionStore } from "../stores/sessionStore";

export const pacienteKeys = {
  all: (filtros?: FiltrosPacientesParams, params?: PaginationParams) =>
    ["pacientes", filtros ?? {}, params ?? {}] as const,
  detail: (id: string) => ["pacientes", id] as const,
  todos: ["pacientes", "todos"] as const,
};

/** Padrón entero para los selectores de paciente, que filtran en el cliente. */
export function useTodosLosPacientes() {
  return useQuery({
    queryKey: pacienteKeys.todos,
    queryFn: todosLosPacientes,
    staleTime: 5 * 60 * 1000,
  });
}

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

/**
 * Registra un paciente.
 *
 * Sin conexión el alta se encola, y con una diferencia importante respecto a
 * las notas: el UUID lo pone el dispositivo y el servidor lo respeta tal cual.
 * Gracias a eso, la nota que se redacte a continuación puede referenciar a este
 * paciente de inmediato y seguir apuntando al lugar correcto después de subir,
 * sin tener que reescribir nada al sincronizar.
 *
 * Devuelve siempre el paciente con su id definitivo, esté ya en el servidor o
 * todavía en la cola, para que la pantalla que lo pidió pueda seguir su curso.
 */
export function useCrearPaciente() {
  const queryClient = useQueryClient();
  const usuarioId = useSessionStore((s) => s.perfil?.id);

  return useMutation<Paciente, unknown, Paciente>({
    mutationFn: async (paciente) => {
      const encolar = async (): Promise<Paciente> => {
        if (!usuarioId) {
          throw new Error("No hay sesión con la que registrar el paciente.");
        }
        const pendiente = await encolarPaciente(
          { ...paciente, id: paciente.id || nuevoId() },
          usuarioId
        );
        return pendiente.datos;
      };

      if (haySinConexion()) return encolar();

      try {
        return await crearPaciente(paciente);
      } catch (error) {
        if (isRedError(error)) return encolar();
        // Historia médica duplicada y demás rechazos del servidor: son datos
        // que hay que corregir, no algo que resuelva esperar a tener red.
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      queryClient.invalidateQueries({ queryKey: pendientesKey });
    },
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
