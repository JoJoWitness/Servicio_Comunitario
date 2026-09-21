/**
 * Formulario reutilizable para registrar o editar un paciente.
 * Requisitos: 11.1–11.8, 13.1–13.2
 */

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GrupoCasillas } from "@/components/GrupoCasillas";
import { ESTUDIOS_IMAGENES } from "@/domain/catalogosBiopsia";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PacienteFormSchema,
  type PacienteFormInput,
} from "@/domain/validation/paciente.validation";
import type { Paciente } from "@/domain/models";

interface PacienteFormProps {
  /** Si se pasa, el formulario se abre en modo edición con estos datos */
  valorInicial?: Partial<PacienteFormInput>;
  onSubmit: (data: PacienteFormInput) => void;
  isPending: boolean;
  errorMsg: string | null;
  submitLabel?: string;
}

export function PacienteForm({
  valorInicial,
  onSubmit,
  isPending,
  errorMsg,
  submitLabel = "Guardar",
}: PacienteFormProps) {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PacienteFormInput>({
    resolver: zodResolver(PacienteFormSchema),
    defaultValues: valorInicial,
  });

  // Reiniciar si cambian los valores iniciales (ej. al cargar paciente para editar)
  useEffect(() => {
    if (valorInicial) reset(valorInicial);
  }, [valorInicial, reset]);

  const tipoDoc = watch("tipoDocumento");
  const genero = watch("genero");
  const fechaNacimiento = watch("fechaNacimiento");

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {errorMsg && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Historia médica */}
      <div className="space-y-1">
        <Label htmlFor="historiaMedica">Historia médica *</Label>
        <Input id="historiaMedica" {...register("historiaMedica")} />
        {errors.historiaMedica && (
          <p className="text-sm text-destructive">{errors.historiaMedica.message}</p>
        )}
      </div>

      {/* Tipo de documento + Número */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="tipoDocumento">Tipo doc. *</Label>
          {/* Requisito 11.3: solo V o E */}
          <Select
            value={tipoDoc}
            onValueChange={(v) => setValue("tipoDocumento", v as "V" | "E", { shouldValidate: true })}
          >
            <SelectTrigger id="tipoDocumento" aria-describedby={errors.tipoDocumento ? "tipodoc-error" : undefined}>
              <SelectValue placeholder="V / E" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="V">V</SelectItem>
              <SelectItem value="E">E</SelectItem>
            </SelectContent>
          </Select>
          {errors.tipoDocumento && (
            <p id="tipodoc-error" className="text-sm text-destructive">{errors.tipoDocumento.message}</p>
          )}
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="numeroIdentificacion">Número de identificación *</Label>
          <Input id="numeroIdentificacion" {...register("numeroIdentificacion")} />
          {errors.numeroIdentificacion && (
            <p className="text-sm text-destructive">{errors.numeroIdentificacion.message}</p>
          )}
        </div>
      </div>

      {/* Nombre */}
      <div className="space-y-1">
        <Label htmlFor="nombre">Nombre completo *</Label>
        <Input id="nombre" {...register("nombre")} />
        {errors.nombre && (
          <p className="text-sm text-destructive">{errors.nombre.message}</p>
        )}
      </div>

      {/* Género */}
      <div className="space-y-1">
        <Label htmlFor="genero">Género *</Label>
        {/* Requisito 11.4: solo M o F */}
        <Select
          value={genero}
          onValueChange={(v) => setValue("genero", v as "M" | "F", { shouldValidate: true })}
        >
          <SelectTrigger id="genero" aria-describedby={errors.genero ? "genero-error" : undefined}>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="M">Masculino</SelectItem>
            <SelectItem value="F">Femenino</SelectItem>
          </SelectContent>
        </Select>
        {errors.genero && (
          <p id="genero-error" className="text-sm text-destructive">{errors.genero.message}</p>
        )}
      </div>

      {/* Fecha de nacimiento */}
      <div className="space-y-1">
        <Label htmlFor="fechaNacimiento">Fecha de nacimiento *</Label>
        <DateInput
          id="fechaNacimiento"
          value={fechaNacimiento ?? ""}
          onChange={(iso) => setValue("fechaNacimiento", iso, { shouldValidate: true })}
        />
        {errors.fechaNacimiento && (
          <p className="text-sm text-destructive">{errors.fechaNacimiento.message}</p>
        )}
      </div>

      {/* Teléfono (opcional) */}
      <div className="space-y-1">
        <Label htmlFor="telefono">Teléfono</Label>
        <Input id="telefono" type="tel" {...register("telefono")} />
      </div>

      {/* Dirección (opcional) */}
      <div className="space-y-1">
        <Label htmlFor="direccion">Dirección</Label>
        <Input id="direccion" {...register("direccion")} />
      </div>

      {/* Antecedentes para la solicitud de biopsia (v0.5.0), todos opcionales */}
      <fieldset className="space-y-4 rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">Antecedentes (solicitud de biopsia)</legend>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="ocupacion">Ocupación</Label>
            <Input id="ocupacion" {...register("ocupacion")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="raza">Raza</Label>
            <Input id="raza" {...register("raza")} />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="antecedentesOncologicos">
            Antecedentes oncológicos del paciente o familiares (padres, hijos, hermanos) u otros de importancia
          </Label>
          <Textarea id="antecedentesOncologicos" rows={2} {...register("antecedentesOncologicos")} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="quimioterapiaCiclos">Quimioterapia (ciclos)</Label>
            <Input id="quimioterapiaCiclos" inputMode="numeric" {...register("quimioterapiaCiclos")} />
            {errors.quimioterapiaCiclos && (
              <p className="text-sm text-destructive">{errors.quimioterapiaCiclos.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="radioterapiaCiclos">Radioterapia (ciclos)</Label>
            <Input id="radioterapiaCiclos" inputMode="numeric" {...register("radioterapiaCiclos")} />
            {errors.radioterapiaCiclos && (
              <p className="text-sm text-destructive">{errors.radioterapiaCiclos.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label id="estudios-label">Estudios de imágenes</Label>
          <Controller
            name="estudiosImagenes"
            control={control}
            render={({ field }) => (
              <GrupoCasillas
                idPrefijo="estudio"
                aria-labelledby="estudios-label"
                opciones={ESTUDIOS_IMAGENES}
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="hallazgoEstudios">Hallazgo de importancia en los estudios</Label>
          <Textarea id="hallazgoEstudios" rows={2} {...register("hallazgoEstudios")} />
        </div>
      </fieldset>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Helper para convertir Paciente → PacienteFormInput (para edición)
// ---------------------------------------------------------------------------

export function pacienteAFormInput(p: Paciente): PacienteFormInput {
  return {
    historiaMedica: p.historiaMedica,
    tipoDocumento: p.tipoDocumento,
    numeroIdentificacion: p.numeroIdentificacion,
    nombre: p.nombre,
    genero: p.genero,
    // ISO date string para <input type="date">
    fechaNacimiento: p.fechaNacimiento.toISOString().split("T")[0],
    telefono: p.telefono,
    direccion: p.direccion,
    ocupacion: p.ocupacion ?? "",
    raza: p.raza ?? "",
    antecedentesOncologicos: p.antecedentesOncologicos ?? "",
    quimioterapiaCiclos: p.quimioterapiaCiclos?.toString() ?? "",
    radioterapiaCiclos: p.radioterapiaCiclos?.toString() ?? "",
    estudiosImagenes: p.estudiosImagenes ?? [],
    hallazgoEstudios: p.hallazgoEstudios ?? "",
  };
}

/** Los antecedentes del formulario, ya en la forma del dominio. */
export function antecedentesDesdeFormulario(
  d: PacienteFormInput
): Pick<
  Paciente,
  | "ocupacion"
  | "raza"
  | "antecedentesOncologicos"
  | "quimioterapiaCiclos"
  | "radioterapiaCiclos"
  | "estudiosImagenes"
  | "hallazgoEstudios"
> {
  const numero = (v?: string) => (v?.trim() ? Number(v.trim()) : undefined);
  const texto = (v?: string) => (v?.trim() ? v.trim() : undefined);
  return {
    ocupacion: texto(d.ocupacion),
    raza: texto(d.raza),
    antecedentesOncologicos: texto(d.antecedentesOncologicos),
    quimioterapiaCiclos: numero(d.quimioterapiaCiclos),
    radioterapiaCiclos: numero(d.radioterapiaCiclos),
    estudiosImagenes: d.estudiosImagenes ?? [],
    hallazgoEstudios: texto(d.hallazgoEstudios),
  };
}
