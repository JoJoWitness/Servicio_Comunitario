/**
 * Hooks de sincronización — el puente entre la cola y la interfaz.
 *
 * `useSincronizacionAutomatica` va una sola vez en la raíz de la aplicación y se
 * encarga de subir lo pendiente cuando vuelve la red.
 * `usePendientes` lo usa cualquier pantalla que quiera mostrar o manipular la
 * cola.
 */

import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useConexionStore } from "@/stores/conexionStore";
import { useSessionStore } from "@/stores/sessionStore";
import type { Nota } from "@/domain/models";
import {
  actualizarPendiente,
  listarPendientes,
  obtenerPendiente,
  quitarPendiente,
  reintentar,
  type NotaPendiente,
  type Pendiente,
} from "./outbox";
import { sincronizar, type ResumenSync } from "./sincronizador";

export const pendientesKey = ["pendientes"] as const;

/**
 * Lista de pendientes del médico de la sesión, viva: se refresca sola cuando
 * la cola cambia. El id del usuario entra en la clave para que al cambiar de
 * cuenta en el mismo equipo no se muestre la cola del anterior desde caché.
 */
export function usePendientes() {
  const usuarioId = useSessionStore((s) => s.perfil?.id);

  return useQuery<Pendiente[]>({
    queryKey: [...pendientesKey, usuarioId],
    queryFn: () => listarPendientes(usuarioId),
    enabled: !!usuarioId,
    // La cola es local: consultarla no cuesta red y conviene que esté al día.
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

/**
 * Dispara una sincronización y refresca todo lo que pudo cambiar con ella.
 * Es lo que hay detrás del botón "Sincronizar ahora".
 */
export function useSincronizarAhora() {
  const queryClient = useQueryClient();

  return useMutation<ResumenSync>({
    mutationFn: sincronizar,
    onSettled: (resumen) => {
      queryClient.invalidateQueries({ queryKey: pendientesKey });
      // Si subió algo, los listados del servidor ya no reflejan la realidad.
      if (resumen?.subidos) {
        queryClient.invalidateQueries({ queryKey: ["misNotas"] });
        queryClient.invalidateQueries({ queryKey: ["todasNotas"] });
        queryClient.invalidateQueries({ queryKey: ["pacientes"] });
        queryClient.invalidateQueries({ queryKey: ["biopsias"] });
      }
    },
  });
}

/**
 * Una nota concreta de la cola, para poder corregirla antes de que suba.
 *
 * Corregir es más útil de lo que parece: una nota rechazada por el servidor
 * —un médico del equipo dado de baja, un paciente cuya historia médica ya
 * existía— no se arregla reintentando. O se edita, o se pierde.
 */
export function usePendienteNota(clientUuid?: string) {
  return useQuery<NotaPendiente | null>({
    // El segmento "nota" evita que esta clave choque con la de la lista, que
    // también lleva un UUID (el del usuario) en la misma posición.
    queryKey: [...pendientesKey, "nota", clientUuid],
    queryFn: async () => {
      if (!clientUuid) return null;
      const item = await obtenerPendiente(clientUuid);
      return item && item.tipo === "nota" ? item : null;
    },
    enabled: !!clientUuid,
  });
}

/**
 * Guarda los cambios de una nota pendiente sin sacarla de la cola, y la
 * devuelve al estado "en espera" para que la próxima sincronización la
 * reintente con los datos corregidos.
 */
export function useGuardarNotaPendiente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientUuid,
      nota,
      medicoEncargadoId,
    }: {
      clientUuid: string;
      nota: Nota;
      medicoEncargadoId: string;
    }) => {
      const actual = await obtenerPendiente(clientUuid);
      if (!actual || actual.tipo !== "nota") {
        throw new Error("Esa nota ya no está en la cola de este equipo.");
      }

      await actualizarPendiente({
        ...actual,
        datos: nota,
        medicoEncargadoId,
        estado: "en-espera",
        error: undefined,
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: pendientesKey }),
  });
}

/** Devuelve un pendiente en error a la cola, o lo descarta definitivamente. */
export function useAccionesPendiente() {
  const queryClient = useQueryClient();

  const refrescar = useCallback(
    () => queryClient.invalidateQueries({ queryKey: pendientesKey }),
    [queryClient]
  );

  return {
    reintentar: useCallback(
      async (id: string) => {
        await reintentar(id);
        await refrescar();
      },
      [refrescar]
    ),
    descartar: useCallback(
      async (id: string) => {
        await quitarPendiente(id);
        await refrescar();
      },
      [refrescar]
    ),
  };
}

/**
 * Sube lo pendiente en cuanto haya red y sesión.
 *
 * Se dispara en el flanco: solo cuando el estado pasa de "sin conexión" a "en
 * línea", no en cada render mientras haya conexión. Sin esa condición, el
 * sondeo periódico del Store_Conexion acabaría lanzando una sincronización por
 * minuto contra una cola vacía.
 *
 * Exige sesión en modo `online`: en modo offline la cookie no está confirmada y
 * subir solo conseguiría un 401 que expulsa al médico de la aplicación.
 */
export function useSincronizacionAutomatica() {
  const estadoConexion = useConexionStore((s) => s.estado);
  const estadoSesion = useSessionStore((s) => s.estado);
  const modo = useSessionStore((s) => s.modo);
  const queryClient = useQueryClient();

  // Se puede subir cuando hay red y una sesión que el servidor reconoce.
  const puedeSubir =
    estadoConexion === "en-linea" && estadoSesion === "autenticado" && modo === "online";
  const podiaAntes = useRef(puedeSubir);

  // Sesión abierta sin servidor: hay red otra vez, pero ninguna cookie la
  // respalda, así que subir solo conseguiría un 401.
  const sesionSinConfirmar =
    estadoConexion === "en-linea" && estadoSesion === "autenticado" && modo === "offline";

  useEffect(() => {
    if (!sesionSinConfirmar) return;

    // Volver a preguntarle al backend si nos conoce. Los dos desenlaces son
    // correctos: si la cookie seguía viva —el caso de haber perdido la red con
    // la sesión ya abierta— la validación pasa, el modo vuelve a `online` y el
    // efecto de abajo sincroniza. Si de verdad no hay sesión, responde 401, el
    // interceptor lleva al login y la cola espera intacta en IndexedDB hasta
    // que el médico entre.
    queryClient.invalidateQueries({ queryKey: ["session"] });
  }, [sesionSinConfirmar, queryClient]);

  useEffect(() => {
    const antes = podiaAntes.current;
    podiaAntes.current = puedeSubir;

    // Solo en el flanco: el sondeo periódico del Store_Conexion mantiene
    // `puedeSubir` en true todo el tiempo, y sin esta condición se lanzaría una
    // sincronización por minuto contra una cola vacía.
    if (antes || !puedeSubir) return;

    void sincronizar().then((resumen) => {
      queryClient.invalidateQueries({ queryKey: pendientesKey });
      if (resumen.subidos > 0) {
        queryClient.invalidateQueries({ queryKey: ["misNotas"] });
        queryClient.invalidateQueries({ queryKey: ["todasNotas"] });
        queryClient.invalidateQueries({ queryKey: ["pacientes"] });
        queryClient.invalidateQueries({ queryKey: ["biopsias"] });
      }
    });
  }, [puedeSubir, queryClient]);
}
