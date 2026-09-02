/**
 * Diálogo con los datos de la muestra: registrar una biopsia desde la nota o
 * corregir sus datos desde el panel. El trámite (envío, resultado, entrega)
 * no va aquí: tiene sus propios pasos en la línea de tiempo.
 */

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutocompleteInput } from "@/features/notas/AutocompleteInput";
import { useDiagnosticos } from "@/hooks/useCatalogos";
import { useTodosLosUsuarios } from "@/hooks/useUsuarios";
import {
  BiopsiaFormSchema,
  type BiopsiaFormInput,
  type BiopsiaFormValues,
} from "@/domain/validation/biopsia.validation";
import { TEJIDOS_BIOPSIA } from "./tejidos";

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
}: FormBiopsiaDialogProps) {
  const { data: diagnosticos } = useDiagnosticos();
  const { data: usuarios } = useTodosLosUsuarios();
  const medicos = (usuarios ?? []).filter((u) => u.rol === "medico");
  const opcionesDx = (diagnosticos ?? []).map((d) => d.diagnostico);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BiopsiaFormInput>({
    resolver: zodResolver(BiopsiaFormSchema),
    defaultValues: { ojo: "", ...valorInicial },
  });

  // Cada apertura arranca de los valores que le tocan (los de la nota, o los
  // de la biopsia que se corrige), no de lo que quedó de la vez anterior.
  // Solo en el flanco de apertura: `valorInicial` suele ser un objeto nuevo
  // en cada render del padre, y resetear con cada uno borraría lo escrito.
  const abiertoAntes = useRef(false);
  useEffect(() => {
    if (open && !abiertoAntes.current) reset({ ojo: "", ...valorInicial });
    abiertoAntes.current = open;
  }, [open, valorInicial, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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

          <div className="space-y-1">
            <Label htmlFor="b-tejido">Tejido *</Label>
            <Controller
              name="tejido"
              control={control}
              render={({ field }) => (
                <AutocompleteInput
                  id="b-tejido"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  opciones={TEJIDOS_BIOPSIA}
                  permitirExplorar
                  placeholder="Pterigión, lesión palpebral…"
                />
              )}
            />
            {errors.tejido && (
              <p className="text-sm text-destructive">{errors.tejido.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="b-ojo">Ojo</Label>
              <Controller
                name="ojo"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="b-ojo">
                      <SelectValue placeholder="Sin indicar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin indicar</SelectItem>
                      <SelectItem value="OD">OD</SelectItem>
                      <SelectItem value="OI">OI</SelectItem>
                      <SelectItem value="AO">AO</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="b-fecha">Fecha de toma *</Label>
              <Controller
                name="fechaToma"
                control={control}
                render={({ field }) => (
                  <DateInput id="b-fecha" value={field.value ?? ""} onChange={field.onChange} />
                )}
              />
              {errors.fechaToma && (
                <p className="text-sm text-destructive">{errors.fechaToma.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="b-medico">Médico responsable *</Label>
            <Controller
              name="idMedicoResponsable"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="b-medico">
                    <SelectValue placeholder="Seleccionar médico…" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nombres} {m.apellidos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.idMedicoResponsable && (
              <p className="text-sm text-destructive">{errors.idMedicoResponsable.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="b-dx">Diagnóstico presuntivo</Label>
            <Controller
              name="diagnosticoPresuntivo"
              control={control}
              render={({ field }) => (
                <AutocompleteInput
                  id="b-dx"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  opciones={opcionesDx}
                  placeholder="Escribir o seleccionar…"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="b-macro">Descripción macroscópica</Label>
            <Textarea
              id="b-macro"
              rows={3}
              placeholder="Tamaño, aspecto, número de fragmentos"
              {...register("descripcionMacroscopica")}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="b-obs">Observaciones</Label>
            <Textarea id="b-obs" rows={2} {...register("observaciones")} />
          </div>

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
