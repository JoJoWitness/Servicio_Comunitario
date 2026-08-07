/**
 * Casilla de verificación con etiqueta.
 *
 * Se apoya en un `<input type="checkbox">` real (accesible, compatible con
 * `react-hook-form` vía `register`) pero oculta su apariencia nativa y dibuja
 * el recuadro con los tokens del tema, para que se vea igual en claro y en
 * oscuro. La tarjeta que lo envuelve se resalta cuando está marcado.
 */

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<"input">, "type"> {
  /** Texto visible junto a la casilla. */
  label: React.ReactNode;
  /** Clases para la etiqueta contenedora. */
  containerClassName?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, containerClassName, disabled, ...props }, ref) => {
    return (
      <label
        className={cn(
          "flex cursor-pointer select-none items-center gap-2.5 rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors",
          "hover:bg-accent/50",
          "has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-foreground",
          "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
          disabled && "cursor-not-allowed opacity-50",
          containerClassName
        )}
      >
        <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
          <input
            ref={ref}
            type="checkbox"
            disabled={disabled}
            className={cn(
              "peer h-4 w-4 shrink-0 appearance-none rounded-[4px] border border-muted-foreground/60 bg-background outline-none transition-colors",
              "checked:border-primary checked:bg-primary",
              "disabled:cursor-not-allowed",
              className
            )}
            {...props}
          />
          <Check
            aria-hidden
            strokeWidth={3}
            className="pointer-events-none absolute h-3 w-3 text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100"
          />
        </span>
        {label}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
