/**
 * Diálogo con los datos de la muestra: registrar una biopsia desde la nota o
 * corregir sus datos desde el panel. El trámite (envío, resultado, entrega)
 * no va aquí: tiene sus propios pasos en la línea de tiempo.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BiopsiaFormSchema,
  type BiopsiaFormInput,
  type BiopsiaFormValues,
} from "@/domain/validation/biopsia.validation";
import { CamposBiopsia } from "./CamposBiopsia";
import { FORMULARIO_BIOPSIA_VACIO } from "./descriptoresForm";

interface FormBiopsiaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descripcion?: string;
  valorInicial?: Partial<BiopsiaFormInput>;
  onSubmit: (valores: BiopsiaFormValues) => void | Promise<void>;
  guardando?: boolean;
  error?: string | null;
  submitLabel?: string;
  /** Controles propios de quien abre el diálogo, encima de los campos (p. ej. la nota de origen). */
  encabezado?: ReactNode;
  /**
   * Cuando cambia con el diálogo abierto, el formulario vuelve a arrancar de
   * `valorInicial`: sirve para recargar ojo, fecha y médico al elegir otra nota.
   */
  claveReinicio?: string | number;
}

export function FormBiopsiaDialog({
  open,
  onOpenChange,
  titulo,
  descripcion,
  valorInicial,
  onSubmit,
  guardando = false,
  error,
  submitLabel = "Guardar",
  encabezado,
  claveReinicio,
}: FormBiopsiaDialogProps) {
  const form = useForm<BiopsiaFormInput>({
    resolver: zodResolver(BiopsiaFormSchema),
    defaultValues: { ...FORMULARIO_BIOPSIA_VACIO, ...valorInicial },
  });
  const { handleSubmit, reset } = form;

  // Cada apertura arranca de los valores que le tocan (los de la nota, o los
  // de la biopsia que se corrige), no de lo que quedó de la vez anterior.
  // Solo en el flanco de apertura: `valorInicial` suele ser un objeto nuevo
  // en cada render del padre, y resetear con cada uno borraría lo escrito.
  const abiertoAntes = useRef(false);
  useEffect(() => {
    if (open && !abiertoAntes.current) reset({ ...FORMULARIO_BIOPSIA_VACIO, ...valorInicial });
    abiertoAntes.current = open;
  }, [open, valorInicial, reset]);

  // Y también cuando quien abre pide reiniciar (cambió la nota de origen).
  const claveAntes = useRef(claveReinicio);
  useEffect(() => {
    if (open && claveAntes.current !== claveReinicio) {
      reset({ ...FORMULARIO_BIOPSIA_VACIO, ...valorInicial });
    }
    claveAntes.current = claveReinicio;
  }, [open, claveReinicio, valorInicial, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>

        <form
          onSubmit={handleSubmit((v) => void onSubmit(v as BiopsiaFormValues))}
          noValidate
          className="space-y-4"
        >
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {encabezado}

          <CamposBiopsia form={form} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
