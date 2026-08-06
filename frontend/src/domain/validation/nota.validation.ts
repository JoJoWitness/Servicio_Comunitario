/**
 * Validación de la nota operatoria en cliente (Requisitos 14.2, 14.4, 14.5, 21.3).
 *
 * Reglas (idénticas en creación y edición):
 * 1. Se debe seleccionar o registrar un paciente.
 * 2. El diagnóstico preoperatorio es obligatorio.
 * 3. La intervención realizada es obligatoria.
 * 4. La fecha de comienzo es obligatoria.
 * 5. La hora de culminación no puede ser anterior a la hora de comienzo.
 *
 * Integración con shadcn/ui: se exporta el schema de Zod para usar con
 * `react-hook-form` + `@hookform/resolvers/zod` en el formulario de nota.
 */

import { z } from "zod";
import { esCulminacionAnterior } from "../../lib/datetime";

// ---------------------------------------------------------------------------
// Schema de Zod
// ---------------------------------------------------------------------------

/**
 * Patrón para horas en formato "HH:mm".
 * Acepta 00:00–23:59.
 */
const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const NotaFormSchema = z
  .object({
    /** UUID del paciente seleccionado */
    idPaciente: z
      .string({ required_error: "Debes seleccionar o registrar un paciente" })
      .min(1, "Debes seleccionar o registrar un paciente"),

    dxPreOperatorio: z
      .string({ required_error: "El diagnóstico preoperatorio es obligatorio" })
      .min(1, "El diagnóstico preoperatorio es obligatorio"),

    dxPostOperatorio: z.string().optional().default(""),

    intervencionRealizada: z
      .string({ required_error: "La intervención realizada es obligatoria" })
      .min(1, "La intervención realizada es obligatoria"),

    resumenIntervencion: z.string().optional().default(""),

    /** ISO date string o Date serializable; se valida que esté presente */
    fechaComienzo: z
      .string({ required_error: "La fecha de comienzo es obligatoria" })
      .min(1, "La fecha de comienzo es obligatoria"),

    fechaCulminacion: z.string().optional().default(""),

    /** Formato "HH:mm" */
    horaComienzo: z
      .string()
      .regex(HORA_REGEX, 'Formato de hora inválido, usa "HH:mm"')
      .optional()
      .or(z.literal("")),

    /** Formato "HH:mm" */
    horaCulminacion: z
      .string()
      .regex(HORA_REGEX, 'Formato de hora inválido, usa "HH:mm"')
      .optional()
      .or(z.literal("")),

    pabellon: z.string().optional().default(""),

    esElectiva: z.boolean().optional().default(false),
    esEmergencia: z.boolean().optional().default(false),
    tuvoBiopsia: z.boolean().optional().default(false),

    anestesia: z.string().optional().default(""),
    medicoEncargado: z.string().optional(),
    equipo: z.array(z.string()).optional().default([]),
    tecnica: z.string().optional().default(""),
  })
  .refine(
    (data) => {
      // Validar hora de culminación no anterior a la de comienzo,
      // solo cuando ambas están presentes y tienen formato válido.
      const inicio = data.horaComienzo;
      const fin = data.horaCulminacion;
      if (inicio && fin && HORA_REGEX.test(inicio) && HORA_REGEX.test(fin)) {
        return !esCulminacionAnterior(inicio, fin);
      }
      return true;
    },
    {
      message:
        "La hora de culminación no puede ser anterior a la hora de comienzo",
      path: ["horaCulminacion"],
    }
  );

export type NotaFormInput = z.infer<typeof NotaFormSchema>;

// ---------------------------------------------------------------------------
// Función de validación pura (usable fuera de formularios, ej. en tests)
// ---------------------------------------------------------------------------

export type NotaValidationResult =
  | { ok: true }
  | { ok: false; errores: string[] };

/**
 * Valida los campos mínimos de una nota operatoria.
 *
 * Idéntica en creación y edición (Requisito 21.3).
 *
 * Requisito 14.2: requiere paciente, dx preoperatorio, intervención realizada y fecha.
 * Requisito 14.5: la hora de culminación no puede ser anterior a la de comienzo.
 *
 * @param campos - Objeto parcial con los campos del formulario de nota
 * @returns `{ ok: true }` si pasa, o `{ ok: false, errores: string[] }` si falla
 */
export function validarNota(
  campos: Partial<NotaFormInput>
): NotaValidationResult {
  const result = NotaFormSchema.safeParse(campos);

  if (result.success) {
    return { ok: true };
  }

  const errores = result.error.errors.map((e) => e.message);
  return { ok: false, errores };
}
