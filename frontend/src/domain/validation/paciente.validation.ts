/**
 * Validación del formulario de paciente (Requisitos 11.2, 11.3, 11.4).
 *
 * Campos obligatorios:
 * - historiaMedica, tipoDocumento, numeroIdentificacion, nombre, genero, fechaNacimiento
 *
 * Restricciones adicionales:
 * - tipoDocumento: solo "V" o "E"
 * - genero: solo "M" o "F"
 *
 * Campos opcionales: telefono, direccion
 *
 * Integración con shadcn/ui: se exporta el schema de Zod para usar con
 * `react-hook-form` + `@hookform/resolvers/zod` en el formulario de paciente.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schema de Zod
// ---------------------------------------------------------------------------

export const PacienteFormSchema = z.object({
  historiaMedica: z
    .string({ required_error: "La historia médica es obligatoria" })
    .min(1, "La historia médica es obligatoria"),

  tipoDocumento: z.enum(["V", "E"], {
    required_error: "El tipo de documento es obligatorio",
    invalid_type_error: 'El tipo de documento debe ser "V" o "E"',
  }),

  numeroIdentificacion: z
    .string({ required_error: "El número de identificación es obligatorio" })
    .min(1, "El número de identificación es obligatorio"),

  nombre: z
    .string({ required_error: "El nombre del paciente es obligatorio" })
    .min(1, "El nombre del paciente es obligatorio"),

  genero: z.enum(["M", "F"], {
    required_error: "El género es obligatorio",
    invalid_type_error: 'El género debe ser "M" o "F"',
  }),

  /** ISO date string del nacimiento, ej. "1985-03-22" */
  fechaNacimiento: z
    .string({ required_error: "La fecha de nacimiento es obligatoria" })
    .min(1, "La fecha de nacimiento es obligatoria"),

  /** Opcional */
  telefono: z.string().optional(),
  /** Opcional */
  direccion: z.string().optional(),
});

export type PacienteFormInput = z.infer<typeof PacienteFormSchema>;

// ---------------------------------------------------------------------------
// Función de validación pura (usable fuera de formularios, ej. en tests)
// ---------------------------------------------------------------------------

export type PacienteValidationResult =
  | { ok: true }
  | { ok: false; errores: string[] };

/**
 * Valida los campos del formulario de paciente.
 *
 * Requisito 11.2: campos obligatorios presentes.
 * Requisito 11.3: tipoDocumento in { "V", "E" }.
 * Requisito 11.4: genero in { "M", "F" }.
 *
 * @param campos - Objeto parcial con los campos del formulario de paciente
 * @returns `{ ok: true }` si pasa, o `{ ok: false, errores: string[] }` si falla
 */
export function validarPaciente(
  campos: Partial<PacienteFormInput>
): PacienteValidationResult {
  const result = PacienteFormSchema.safeParse(campos);

  if (result.success) {
    return { ok: true };
  }

  const errores = result.error.errors.map((e) => e.message);
  return { ok: false, errores };
}
