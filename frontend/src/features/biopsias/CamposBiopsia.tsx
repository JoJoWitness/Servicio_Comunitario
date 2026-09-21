/**
 * Los campos de la muestra y de la solicitud de biopsia, sobre un formulario
 * de react-hook-form que aporta quien los usa. Los comparten el diálogo de
 * registro y corrección (`FormBiopsiaDialog`), la biopsia que se describe al
 * crear la nota (`FormNotaPage`) y la biopsia suelta (`NuevaBiopsiaDialog`).
 *
 * `ocultar` apaga lo que ya viene dado por el contexto: al crear la nota, el
 * ojo, la fecha y el médico son los de la nota y no se vuelven a preguntar.
 * Quien oculta un campo obligatorio tiene que ponerle valor antes de validar.
 */

import { Controller, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { GrupoCasillas } from "@/components/GrupoCasillas";
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
import type { BiopsiaFormInput } from "@/domain/validation/biopsia.validation";
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
import { TEJIDOS_BIOPSIA } from "./tejidos";

interface CamposBiopsiaProps {
  form: UseFormReturn<BiopsiaFormInput>;
  /** Prefijo de los `id` de los controles, para no chocar con otro formulario en la misma página. */
  idPrefijo?: string;
  ocultar?: { ojo?: boolean; fechaToma?: boolean; medico?: boolean };
}

export function CamposBiopsia({ form, idPrefijo = "b", ocultar = {} }: CamposBiopsiaProps) {
  const p = idPrefijo;
  const {
    control,
    register,
    watch,
    formState: { errors },
  } = form;
  const { data: diagnosticos } = useDiagnosticos();
  const { data: usuarios } = useTodosLosUsuarios();
  const medicos = (usuarios ?? []).filter((u) => u.rol === "medico");
  const opcionesDx = (diagnosticos ?? []).map((d) => d.diagnostico);

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

  return (
    <>
      {/* ── 2. Información sobre la muestra, en el orden del papel ── */}
      <fieldset className="space-y-4 rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">Información sobre la muestra</legend>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`${p}-tipo`}>Biopsia</Label>
            <SelectOpcional name="tipoBiopsia" id={`${p}-tipo`} opciones={TIPOS_BIOPSIA} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${p}-cito`}>Citología</Label>
            <SelectOpcional name="tipoCitologia" id={`${p}-cito`} opciones={TIPOS_CITOLOGIA} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`${p}-centro`}>Centro médico donde se toma la muestra</Label>
            <Controller
              name="centroToma"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? "hcsc"} onValueChange={field.onChange}>
                  <SelectTrigger id={`${p}-centro`}>
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
              <Label htmlFor={`${p}-centro-otro`}>¿Cuál?</Label>
              <Input id={`${p}-centro-otro`} {...register("centroTomaOtro")} />
            </div>
          )}
        </div>

        {!ocultar.fechaToma && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`${p}-fecha`}>Fecha de toma de la muestra *</Label>
              <Controller
                name="fechaToma"
                control={control}
                render={({ field }) => (
                  <DateInput id={`${p}-fecha`} value={field.value ?? ""} onChange={field.onChange} />
                )}
              />
              {errors.fechaToma && (
                <p className="text-sm text-destructive">{errors.fechaToma.message}</p>
              )}
            </div>
          </div>
        )}

        {/* El tejido es el nombre con el que la biopsia aparece en las listas;
            en el papel corresponde a "Tipo de muestra" y su casilla "Otro". */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`${p}-tejido`}>Tejido *</Label>
            <Controller
              name="tejido"
              control={control}
              render={({ field }) => (
                <AutocompleteInput
                  id={`${p}-tejido`}
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
          <div className="space-y-1">
            <Label htmlFor={`${p}-muestra`}>Tipo de muestra</Label>
            <SelectOpcional name="tipoMuestra" id={`${p}-muestra`} opciones={TIPOS_MUESTRA} />
          </div>
          {tipoMuestra === "otro" && (
            <div className="space-y-1">
              <Label htmlFor={`${p}-muestra-otro`}>¿Cuál?</Label>
              <Input id={`${p}-muestra-otro`} {...register("tipoMuestraOtro")} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label id={`${p}-ubic`}>Ubicación</Label>
            <Controller
              name="ubicacion"
              control={control}
              render={({ field }) => (
                <GrupoCasillas
                  idPrefijo={`${p}-ubic`}
                  aria-labelledby={`${p}-ubic`}
                  opciones={UBICACIONES}
                  value={field.value ?? []}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          {!ocultar.ojo && (
            <div className="space-y-1">
              <Label htmlFor={`${p}-ojo`}>Ojo</Label>
              <Controller
                name="ojo"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id={`${p}-ojo`}>
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
          )}
        </div>
      </fieldset>

      {/* ── Descripción de la lesión, en el orden del papel ── */}
      <fieldset className="space-y-4 rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">Descripción de la lesión</legend>

        <div className="space-y-1">
          <Label htmlFor={`${p}-bordes`}>Bordes</Label>
          <SelectOpcional name="bordes" id={`${p}-bordes`} opciones={BORDES} />
        </div>

        <div className="space-y-1">
          <Label id={`${p}-color`}>Color</Label>
          <Controller
            name="color"
            control={control}
            render={({ field }) => (
              <GrupoCasillas
                idPrefijo={`${p}-color`}
                aria-labelledby={`${p}-color`}
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
            <Label htmlFor={`${p}-tamano`}>Tamaño</Label>
            <SelectOpcional name="tamano" id={`${p}-tamano`} opciones={TAMANOS} />
          </div>
          {tamano === "otro" && (
            <div className="space-y-1">
              <Label htmlFor={`${p}-tamano-otro`}>¿Cuál?</Label>
              <Input id={`${p}-tamano-otro`} placeholder="p. ej. 7 mm" {...register("tamanoOtro")} />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${p}-altura`}>Altura</Label>
          <SelectOpcional name="altura" id={`${p}-altura`} opciones={ALTURAS} />
        </div>

        <div className="space-y-1">
          <Label id={`${p}-cambios`}>Cambios asociados</Label>
          <Controller
            name="cambiosAsociados"
            control={control}
            render={({ field }) => (
              <GrupoCasillas
                idPrefijo={`${p}-cambios`}
                aria-labelledby={`${p}-cambios`}
                opciones={CAMBIOS_ASOCIADOS}
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`${p}-trat`}>¿Recibió la lesión tratamientos previos?</Label>
            <Controller
              name="tratamientosPrevios"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id={`${p}-trat`}>
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
              <Label htmlFor={`${p}-trat-cual`}>¿Cuál?</Label>
              <Input id={`${p}-trat-cual`} {...register("tratamientosPreviosCual")} />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${p}-dx`}>Diagnóstico presuntivo</Label>
          <Controller
            name="diagnosticoPresuntivo"
            control={control}
            render={({ field }) => (
              <AutocompleteInput
                id={`${p}-dx`}
                value={field.value ?? ""}
                onChange={field.onChange}
                opciones={opcionesDx}
                placeholder="Escribir o seleccionar…"
              />
            )}
          />
        </div>

        {!ocultar.medico && (
          <div className="space-y-1">
            <Label htmlFor={`${p}-medico`}>Cirujano responsable de tomar la muestra *</Label>
            <Controller
              name="idMedicoResponsable"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id={`${p}-medico`}>
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
        )}
      </fieldset>
    </>
  );
}
