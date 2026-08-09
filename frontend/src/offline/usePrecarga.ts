/** Hooks de la precarga del espejo (ver `precarga.ts`). */

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useConexionStore } from "@/stores/conexionStore";
import { useSessionStore } from "@/stores/sessionStore";
import { precargadoEn, precargarEspejo, precargarSiHaceFalta } from "./precarga";

export const precargaKey = ["precarga"] as const;

const INTERVALO_REVISION = 5 * 60 * 1000;

/** Va una sola vez, en la raíz de la aplicación. */
export function usePrecargaAutomatica() {
  const estadoConexion = useConexionStore((s) => s.estado);
  const estadoSesion = useSessionStore((s) => s.estado);
  const modo = useSessionStore((s) => s.modo);
  const queryClient = useQueryClient();

  // Modo online: hace falta una sesión que el servidor reconozca.
  const puede =
    estadoConexion === "en-linea" && estadoSesion === "autenticado" && modo === "online";

  useEffect(() => {
    if (!puede) return;

    const revisar = () => {
      void precargarSiHaceFalta()
        .then((resumen) => {
          if (resumen) queryClient.invalidateQueries({ queryKey: precargaKey });
        })
        .catch(() => {
          // Sin copia nueva se sigue con la anterior.
        });
    };

    revisar();
    const temporizador = setInterval(revisar, INTERVALO_REVISION);
    return () => clearInterval(temporizador);
  }, [puede, queryClient]);
}

export function useEstadoPrecarga() {
  return useQuery({
    queryKey: precargaKey,
    queryFn: precargadoEn,
    staleTime: 30_000,
  });
}

export function usePrecargarAhora() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: precargarEspejo,
    onSettled: () => queryClient.invalidateQueries({ queryKey: precargaKey }),
  });
}
