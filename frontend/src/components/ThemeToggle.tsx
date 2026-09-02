/**
 * ThemeToggle — botón con dropdown para cambiar entre light, dark y system.
 * Muestra el icono del modo activo actual.
 */

import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore, resolveEffectiveMode, type ThemeMode } from "@/stores/themeStore";

const OPCIONES: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { mode: "light",  label: "Claro",   icon: <Sun    className="h-4 w-4" /> },
  { mode: "dark",   label: "Oscuro",  icon: <Moon   className="h-4 w-4" /> },
  { mode: "system", label: "Sistema", icon: <Monitor className="h-4 w-4" /> },
];

function ActiveIcon({ mode }: { mode: ThemeMode }) {
  const effective = resolveEffectiveMode(mode);
  if (mode === "system") return <Monitor className="h-4 w-4" />;
  return effective === "dark"
    ? <Moon className="h-4 w-4" />
    : <Sun  className="h-4 w-4" />;
}

interface ThemeToggleProps {
  /** Si es true muestra las tres opciones en fila (para espacios amplios) */
  expanded?: boolean;
}

export function ThemeToggle({ expanded = false }: ThemeToggleProps) {
  const mode    = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  if (expanded) {
    return (
      <div className="flex gap-1" role="group" aria-label="Seleccionar tema">
        {OPCIONES.map((op) => (
          <Button
            key={op.mode}
            variant={mode === op.mode ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 max-lg:h-10 max-lg:w-10"
            onClick={() => setMode(op.mode)}
            aria-label={op.label}
            aria-pressed={mode === op.mode}
            title={op.label}
          >
            {op.icon}
          </Button>
        ))}
      </div>
    );
  }

  // Modo compacto: cicla entre los tres modos en orden
  const ciclar = () => {
    const orden: ThemeMode[] = ["light", "dark", "system"];
    const idx = orden.indexOf(mode);
    setMode(orden[(idx + 1) % orden.length]!);
  };

  const label =
    mode === "light" ? "Modo oscuro" :
    mode === "dark"  ? "Modo sistema" : "Modo claro";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={ciclar}
      aria-label={label}
      title={label}
    >
      <ActiveIcon mode={mode} />
    </Button>
  );
}
