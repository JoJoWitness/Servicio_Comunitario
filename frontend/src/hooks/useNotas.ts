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
  cambiarLegalizacion,
  crearNota,
  editarNota,
  eliminarNota,
  misNotas,
  notasDePaciente,
  obtenerNota,
  todasLasNotas,
} from "../api/endpoints/notas";
import type { PaginationParams } from "../api/types";
import { isRedError } from "../api/errors";
import type { FiltrosNota, Nota, RangoFechas } from "../domain/models";
import { encolarNota, nuevoId } from "../offline/outbox";
import { pendientesKey } from "../offline/useSincronizacion";
import { haySinConexion } from "../stores/conexionStore";
import { useSessionStore } from "../stores/sessionStore";

export const notaKeys = {
  misNotas: (rango?: RangoFechas) => ["misNotas", rango ?? null] as const,
  todasNotas: (filtros?: FiltrosNota, paginacion?: PaginationParams) =>
    ["todasNotas", filtros ?? null, paginacion ?? {}] as const,
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
 * Obtiene todas las notas del servicio con filtros opcionales y paginación.
 * Requisitos 19.1, 19.2 — GET /notas[?medico=&paciente=&from=&to=&page=&size=]
 *
 * La queryKey incluye tanto los filtros como los params de paginación para
 * que TanStack Query refetch automáticamente al cambiar cualquiera de ellos.
 */
export function useTodasLasNotas(filtros?: FiltrosNota, paginacion?: PaginationParams) {
  return useQuery({
    queryKey: notaKeys.todasNotas(filtros, paginacion),
    queryFn: () => todasLasNotas(filtros, paginacion),
    placeholderData: (prev) => prev,
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
/**
 * Cómo terminó el guardado de una nota. La pantalla necesita distinguirlo:
 * una nota subida tiene id y ficha propia a la que navegar; una encolada
 * todavía no existe para nadie más que este dispositivo.
 */
export type ResultadoGuardado =
  | { estado: "subida"; nota: Nota }
  | { estado: "en-cola"; clientUuid: string };

export function useCrearNota() {
  const queryClient = useQueryClient();
  // Dueño de la cola: quien está redactando, que puede no ser el encargado de
  // la operación.
  const usuarioId = useSessionStore((s) => s.perfil?.id);

  return useMutation<
    ResultadoGuardado,
    unknown,
    { nota: Nota; medicoEncargadoId: string }
  >({
    mutationFn: async ({ nota, medicoEncargadoId }) => {
      // El identificador se genera antes de intentar nada: es el mismo tanto si
      // la nota sale ahora por la red como si se queda esperando en la cola, y
      // es lo que impide que acabe duplicada si ocurren las dos cosas.
      const clientUuid = nuevoId();

      const encolar = async (): Promise<ResultadoGuardado> => {
        await encolarNota(nota, medicoEncargadoId, { id: clientUuid, usuarioId });
        return { estado: "en-cola", clientUuid };
      };

      // Ya sabemos que no hay servidor: no se gasta un intento condenado a
      // fallar ni se hace esperar al médico su timeout.
      if (haySinConexion()) return encolar();

      try {
        return { estado: "subida", nota: await crearNota(nota, medicoEncargadoId, clientUuid) };
      } catch (error) {
        // La red se cayó entre que se comprobó y que se pulsó guardar. La nota
        // no se pierde: pasa a la cola igual que si nunca hubiera habido red.
        if (isRedError(error)) return encolar();
        // Cualquier otro error es el servidor rechazando los datos, y eso sí
        // tiene que verlo el médico: encolarlo solo aplazaría el problema.
        throw error;
      }
    },
    onSuccess: (resultado) => {
      if (resultado.estado === "en-cola") {
        queryClient.invalidateQueries({ queryKey: pendientesKey });
        return;
      }
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
 * Pone o quita la marca de legalización de una nota.
 * PATCH /notas/{id}/legalizada
 *
 * Optimista: el interruptor cambia al instante y se revierte si el servidor
 * dice que no. Al confirmar, el detalle se reemplaza con lo que devolvió el
 * servidor (trae `legalizadaEn`, `legalizadaPor` y el nuevo `puedeEditar`) y
 * los listados se invalidan para que la insignia aparezca sin recargar.
 */
export function useCambiarLegalizacion(id: number) {
  const queryClient = useQueryClient();

  return useMutation<Nota, unknown, boolean, { anterior?: Nota }>({
    mutationFn: (legalizada) => cambiarLegalizacion(id, legalizada),
    onMutate: async (legalizada) => {
      await queryClient.cancelQueries({ queryKey: notaKeys.detail(id) });
      const anterior = queryClient.getQueryData<Nota>(notaKeys.detail(id));
      if (anterior) {
        queryClient.setQueryData<Nota>(notaKeys.detail(id), {
          ...anterior,
          legalizada,
          // Mientras responde el servidor, la regla se aplica igual aquí:
          // legalizada bloquea; al quitarla, el servidor dirá si el plazo da.
          puedeEditar: legalizada ? false : anterior.puedeEditar,
        });
      }
      return { anterior };
    },
    onError: (_error, _legalizada, contexto) => {
      if (contexto?.anterior) {
        queryClient.setQueryData(notaKeys.detail(id), contexto.anterior);
      }
    },
    onSuccess: (notaActualizada) => {
      queryClient.setQueryData(notaKeys.detail(id), notaActualizada);
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
