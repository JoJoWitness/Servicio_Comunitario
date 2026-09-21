/**
 * Diálogo con los datos de la muestra: registrar una biopsia desde la nota o
 * corregir sus datos desde el panel. El trámite (envío, resultado, entrega)
 * no va aquí: tiene sus propios pasos en la línea de tiempo.
 */

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GrupoCasillas } from "@/components/GrupoCasillas";
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
import {
  ALTURAS,
  BORDES,
  CAMBIOS_ASOCIADOS,
  CENTROS_TOMA,
  COLORES,
  TAMANOS,
  TIPOS_BIOPSIA,
  TIPOS_CITOLOGIA,
  TIPOS_MUESTRA,
  UBICACIONES,
  type Opcion,
} from "@/domain/catalogosBiopsia";

/** Valores con los que arranca el formulario cuando no hay nada cargado. */
const VACIO: Partial<BiopsiaFormInput> = {
  ojo: "",
  centroToma: "hcsc",
  ubicacion: [],
  color: [],
  cambiosAsociados: [],
};

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
    watch,
    formState: { errors },
  } = useForm<BiopsiaFormInput>({
    resolver: zodResolver(BiopsiaFormSchema),
    defaultValues: { ...VACIO, ...valorInicial },
  });

  const centroToma = watch("centroToma");
  const tipoMuestra = watch("tipoMuestra");
  const tamano = watch("tamano");
  const tratamientosPrevios = watch("tratamientosPrevios");

  /** Un `Select` opcional sobre un vocabulario, con "Sin indicar" como vacío. */
  const SelectOpcional = ({
    name,
    id,
    opciones,
  }: {
    name: keyof BiopsiaFormInput;
    id: string;
    opciones: readonly Opcion[];
  }) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Select value={(field.value as string) ?? ""} onValueChange={field.onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Sin indicar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Sin indicar</SelectItem>
            {opciones.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );

  // Cada apertura arranca de los valores que le tocan (los de la nota, o los
  // de la biopsia que se corrige), no de lo que quedó de la vez anterior.
  // Solo en el flanco de apertura: `valorInicial` suele ser un objeto nuevo
  // en cada render del padre, y resetear con cada uno borraría lo escrito.
  const abiertoAntes = useRef(false);
  useEffect(() => {
    if (open && !abiertoAntes.current) reset({ ...VACIO, ...valorInicial });
    abiertoAntes.current = open;
  }, [open, valorInicial, reset]);

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

          {/* ── Solicitud de biopsia o citología (v0.5.0) ── */}
          <fieldset className="space-y-4 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Solicitud de biopsia</legend>
            <p className="text-xs text-muted-foreground">
              Lo que se marca aquí sale impreso en la solicitud. Lo que quede sin indicar se
              imprime en blanco para llenarlo a mano.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="b-tipo">Biopsia</Label>
                <SelectOpcional name="tipoBiopsia" id="b-tipo" opciones={TIPOS_BIOPSIA} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="b-cito">Citología</Label>
                <SelectOpcional name="tipoCitologia" id="b-cito" opciones={TIPOS_CITOLOGIA} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="b-centro">Centro donde se toma la muestra</Label>
                <Controller
                  name="centroToma"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? "hcsc"} onValueChange={field.onChange}>
                      <SelectTrigger id="b-centro">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CENTROS_TOMA.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {centroToma === "otro" && (
                <div className="space-y-1">
                  <Label htmlFor="b-centro-otro">¿Cuál?</Label>
                  <Input id="b-centro-otro" {...register("centroTomaOtro")} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="b-muestra">Tipo de muestra</Label>
                <SelectOpcional name="tipoMuestra" id="b-muestra" opciones={TIPOS_MUESTRA} />
              </div>
              {tipoMuestra === "otro" && (
                <div className="space-y-1">
                  <Label htmlFor="b-muestra-otro">¿Cuál?</Label>
                  <Input id="b-muestra-otro" {...register("tipoMuestraOtro")} />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label id="b-ubic">Ubicación (el lado sale del ojo)</Label>
              <Controller
                name="ubicacion"
                control={control}
                render={({ field }) => (
                  <GrupoCasillas
                    idPrefijo="b-ubic"
                    aria-labelledby="b-ubic"
                    opciones={UBICACIONES}
                    value={field.value ?? []}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="b-bordes">Bordes</Label>
                <SelectOpcional name="bordes" id="b-bordes" opciones={BORDES} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="b-altura">Altura</Label>
                <SelectOpcional name="altura" id="b-altura" opciones={ALTURAS} />
              </div>
            </div>

            <div className="space-y-1">
              <Label id="b-color">Color</Label>
              <Controller
                name="color"
                control={control}
                render={({ field }) => (
                  <GrupoCasillas
                    idPrefijo="b-color"
                    aria-labelledby="b-color"
                    opciones={COLORES}
                    value={field.value ?? []}
                    onChange={field.onChange}
                  />
                )}
              />
              <Input
                aria-label="Otro color"
                placeholder="Otro color"
                className="mt-2"
                {...register("colorOtro")}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="b-tamano">Tamaño</Label>
                <SelectOpcional name="tamano" id="b-tamano" opciones={TAMANOS} />
              </div>
              {tamano === "otro" && (
                <div className="space-y-1">
                  <Label htmlFor="b-tamano-otro">¿Cuál?</Label>
                  <Input id="b-tamano-otro" placeholder="p. ej. 7 mm" {...register("tamanoOtro")} />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label id="b-cambios">Cambios asociados</Label>
              <Controller
                name="cambiosAsociados"
                control={control}
                render={({ field }) => (
                  <GrupoCasillas
                    idPrefijo="b-cambios"
                    aria-labelledby="b-cambios"
                    opciones={CAMBIOS_ASOCIADOS}
                    value={field.value ?? []}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="b-trat">¿Recibió la lesión tratamientos previos?</Label>
                <Controller
                  name="tratamientosPrevios"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger id="b-trat">
                        <SelectValue placeholder="Sin indicar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin indicar</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="si">Sí</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {tratamientosPrevios === "si" && (
                <div className="space-y-1">
                  <Label htmlFor="b-trat-cual">¿Cuál?</Label>
                  <Input id="b-trat-cual" {...register("tratamientosPreviosCual")} />
                </div>
              )}
            </div>
          </fieldset>

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
