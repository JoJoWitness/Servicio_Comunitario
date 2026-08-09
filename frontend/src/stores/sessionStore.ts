/**
 * Store_Sesion — estado global de la sesión del usuario.
 *
 * El perfil se persiste en localStorage con zustand/persist para que al
 * recargar la página esté disponible inmediatamente sin esperar al backend.
 * validateUser solo confirma si la cookie sigue viva (200 = ok, 401 = expirada).
 *
 * Trabajo sin conexión
 * --------------------
 * Cuando no hay servidor a quien preguntar, el perfil guardado es la única
 * prueba de sesión que queda. Para que eso no signifique "sesión eterna", se
 * persiste también `expiraEn`: la misma ventana de 32 horas que dura la cookie
 * del backend. Dentro de ese plazo la aplicación abre sin pedir nada; pasado,
 * pide la contraseña y la verifica contra la credencial local
 * (`offline/credencialLocal.ts`).
 *
 * `modo` distingue de dónde viene la autorización. No cambia permisos —eso lo
 * sigue decidiendo el servidor en cada petición—, pero sí lo que la interfaz
 * puede prometer: en `offline` no tiene sentido ofrecer exportar el record
 * quirúrgico, que se genera en el servidor.
 *
 * Requisitos: 3.3, 4.2, 4.4, 5.1, 6.2
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Usuario } from "../domain/models";

type EstadoSesion = "cargando" | "autenticado" | "anonimo";

/** Cuánto vale una sesión sin poder confirmarla. Igual que la cookie (32 h). */
export const DURACION_SESION_MS = 32 * 60 * 60 * 1000;

interface SessionState {
  perfil: Usuario | null;
  estado: EstadoSesion;
  /** Instante en que la sesión deja de valer sin volver a autenticarse. */
  expiraEn: number | null;
  /** De dónde viene la autorización actual. */
  modo: "online" | "offline";
  setPerfil: (perfil: Usuario) => void;
  /** Abre sesión verificada contra la credencial guardada en el equipo. */
  abrirSesionOffline: (perfil: Usuario) => void;
  /**
   * Sigue con la sesión que ya había, pero sin servidor que la confirme.
   * A diferencia de `abrirSesionOffline`, no renueva el plazo: una sesión no
   * puede volverse eterna por el mero hecho de estar sin red.
   */
  marcarModoOffline: () => void;
  limpiar: () => void;
  /** True si hay perfil guardado y su plazo todavía no venció. */
  sesionLocalVigente: () => boolean;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      perfil: null,
      estado: "cargando",
      expiraEn: null,
      modo: "online",

      setPerfil: (perfil) =>
        set({
          perfil,
          estado: "autenticado",
          modo: "online",
          expiraEn: Date.now() + DURACION_SESION_MS,
        }),

      abrirSesionOffline: (perfil) =>
        set({
          perfil,
          estado: "autenticado",
          modo: "offline",
          expiraEn: Date.now() + DURACION_SESION_MS,
        }),

      marcarModoOffline: () => {
        if (!get().sesionLocalVigente()) return;
        set({ estado: "autenticado", modo: "offline" });
      },

      limpiar: () =>
        set({ perfil: null, estado: "anonimo", expiraEn: null, modo: "online" }),

      sesionLocalVigente: () => {
        const { perfil, expiraEn } = get();
        return Boolean(perfil && expiraEn && Date.now() < expiraEn);
      },
    }),
    {
      name: "hcsc-session",
      partialize: (state) => ({
        perfil: state.perfil,
        expiraEn: state.expiraEn,
        modo: state.modo,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Un perfil con el plazo vencido no autentica a nadie: se limpia aquí
        // para que ninguna pantalla llegue a verlo.
        const vencida = !state.expiraEn || Date.now() >= state.expiraEn;
        if (state.perfil && !vencida) {
          state.estado = "autenticado";
        } else {
          state.perfil = null;
          state.expiraEn = null;
          state.estado = "cargando";
        }
      },
    }
  )
);
