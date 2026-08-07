/**
 * Grupo de opciones excluyentes.
 *
 * Igual que `Checkbox`, se apoya en `<input type="radio">` reales para
 * conservar la semántica y la navegación con flechas del teclado, pero dibuja
 * el indicador con los tokens del tema.
 *
 * Uso controlado: se pasa `value` y `onValueChange`, de modo que encaja con
 * `Controller` de react-hook-form.
 */

import * as React from "react";

import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: React.ReactNode;
}

export interface RadioGroupProps {
  /** Nombre compartido por las opciones; agrupa los inputs en el navegador. */
  name: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: RadioOption[];
  disabled?: boolean;
  className?: string;
  /** Etiqueta accesible del grupo (se expone como `aria-label`). */
  "aria-label"?: string;
}

export function RadioGroup({
  name,
  value,
  onValueChange,
  options,
  disabled,
  className,
  ...props
}: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      aria-label={props["aria-label"]}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((opcion) => (
        <label
          key={opcion.value}
          className={cn(
            "flex cursor-pointer select-none items-center gap-2.5 rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors",
            "hover:bg-accent/50",
            "has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-foreground",
            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
            <input
              type="radio"
              name={name}
              value={opcion.value}
              checked={value === opcion.value}
              disabled={disabled}
              onChange={() => onValueChange?.(opcion.value)}
              className="peer h-4 w-4 shrink-0 appearance-none rounded-full border border-muted-foreground/60 bg-background outline-none transition-colors checked:border-primary disabled:cursor-not-allowed"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute h-2 w-2 rounded-full bg-primary opacity-0 transition-opacity peer-checked:opacity-100"
            />
          </span>
          {opcion.label}
        </label>
      ))}
    </div>
  );
}
