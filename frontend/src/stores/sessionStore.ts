/**
 * Store_Sesion — estado global de la sesión del usuario.
 *
 * El perfil se persiste en localStorage con zustand/persist para que al
 * recargar la página esté disponible inmediatamente sin esperar al backend.
 * validateUser solo confirma si la cookie sigue viva (200 = ok, 401 = expirada).
 *
 * Requisitos: 3.3, 4.2, 4.4, 5.1, 6.2
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Usuario } from "../domain/models";

type EstadoSesion = "cargando" | "autenticado" | "anonimo";

interface SessionState {
  perfil: Usuario | null;
  estado: EstadoSesion;
  setPerfil: (perfil: Usuario) => void;
  limpiar: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      perfil: null,
      estado: "cargando",

      setPerfil: (perfil) => set({ perfil, estado: "autenticado" }),

      limpiar: () => set({ perfil: null, estado: "anonimo" }),
    }),
    {
      name: "hcsc-session",
      partialize: (state) => ({ perfil: state.perfil }),
      onRehydrateStorage: () => (state) => {
        if (state?.perfil) {
          state.estado = "autenticado";
        } else {
          state!.estado = "cargando";
        }
      },
    }
  )
);
