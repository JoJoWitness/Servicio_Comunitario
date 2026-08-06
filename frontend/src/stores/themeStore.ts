/**
 * Store de tema — persiste la preferencia de color del usuario en localStorage.
 *
 * Modos:
 * - "light"  → fuerza tema claro
 * - "dark"   → fuerza tema oscuro
 * - "system" → sigue la preferencia del sistema operativo (prefers-color-scheme)
 *
 * La inyección de la clase `dark` en <html> la realiza ThemeProvider en App.tsx.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "system",
      setMode: (mode) => set({ mode }),
    }),
    {
      name: "hcsc-theme", // clave en localStorage
    }
  )
);

// ---------------------------------------------------------------------------
// Helper: resuelve el modo efectivo teniendo en cuenta "system"
// ---------------------------------------------------------------------------

/**
 * Devuelve `"dark"` o `"light"` resolviendo la preferencia del sistema
 * cuando el modo es `"system"`.
 */
export function resolveEffectiveMode(mode: ThemeMode): "dark" | "light" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}
