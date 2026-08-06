/**
 * Store_Sesion — estado global de la sesión del usuario.
 *
 * Mantiene el perfil autenticado y el estado del ciclo de vida de la sesión.
 * Es la única fuente de verdad sobre quién está logueado y si la app terminó
 * de verificar la sesión al arranque.
 *
 * Usado por:
 * - `App.tsx` → rehidratación al iniciar (Requisito 4)
 * - `Guardia_Ruta` → redirigir a /login si no hay sesión (Requisito 7.1)
 * - `Interceptor_401` → limpiar sesión ante 401 (Requisito 5.1)
 * - `logout` → limpiar tras cerrar sesión (Requisito 6.2)
 *
 * Requisitos: 3.3, 4.2, 4.4, 5.1, 6.2
 */

import { create } from "zustand";
import type { Usuario } from "../domain/models";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type EstadoSesion = "cargando" | "autenticado" | "anonimo";

interface SessionState {
  /** Perfil del usuario autenticado; null si no hay sesión */
  perfil: Usuario | null;
  /**
   * Estado del ciclo de vida de la sesión:
   * - "cargando"    → rehidratación en curso, no renderizar contenido protegido
   * - "autenticado" → sesión válida, perfil disponible
   * - "anonimo"     → sin sesión, redirigir a /login
   */
  estado: EstadoSesion;
  /** Almacena el perfil y marca la sesión como autenticada */
  setPerfil: (perfil: Usuario) => void;
  /** Limpia el perfil y marca la sesión como anónima. Usado por logout e Interceptor_401 */
  limpiar: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSessionStore = create<SessionState>((set) => ({
  perfil: null,
  // Estado inicial "cargando" para que la Guardia_Ruta espere la rehidratación
  // antes de redirigir — Requisito 4.4
  estado: "cargando",

  setPerfil: (perfil) =>
    set({ perfil, estado: "autenticado" }),

  limpiar: () =>
    set({ perfil: null, estado: "anonimo" }),
}));
