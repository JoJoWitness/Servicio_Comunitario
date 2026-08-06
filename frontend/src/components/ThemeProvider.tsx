/**
 * ThemeProvider — inyecta/quita la clase `dark` en <html> según el estado
 * del themeStore, y escucha cambios del sistema cuando el modo es "system".
 *
 * Se monta una sola vez en App.tsx, antes del router.
 */

import { useEffect } from "react";
import { resolveEffectiveMode, useThemeStore } from "@/stores/themeStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const effective = resolveEffectiveMode(mode);
      root.classList.toggle("dark", effective === "dark");
    };

    apply();

    // Escuchar cambios del SO solo cuando el modo es "system"
    if (mode !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [mode]);

  return <>{children}</>;
}
