/**
 * Campo de contraseña con interruptor para verla.
 *
 * Escribir a ciegas una clave que nadie recuerda todavía —la inicial que el
 * admin le pone a un médico, o la nueva de un cambio— es la forma más fácil de
 * quedarse fuera sin saber por qué. El ojo destapa el texto mientras se
 * escribe; el campo vuelve a ocultarse en cuanto se pulsa otra vez.
 *
 * Acepta las mismas props que `Input` salvo `type`, que lo maneja él.
 */

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          // Sitio para el botón: sin esto el texto pasa por debajo del ojo.
          className={cn("pr-10", className)}
          {...props}
        />
        <button
          type="button"
          // `tabIndex={-1}` deja el tabulador yendo del campo al siguiente, que
          // es lo que espera quien rellena el formulario con el teclado.
          tabIndex={-1}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
