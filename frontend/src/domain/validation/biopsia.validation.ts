/**
 * Validación del formulario de la muestra (registro y edición de datos).
 * Las transiciones de estado (envío, resultado, entrega) validan sus propios
 * campos en el diálogo que las dispara; aquí va lo que describe la muestra.
 */

import { z } from "zod";

export const BiopsiaFormSchema = z.object({
  tejido: z
    .string({ required_error: "Indica qué tejido se extrajo" })
    .trim()
    .min(1, "Indica qué tejido se extrajo"),
  ojo: z.enum(["", "OD", "OI", "AO"]).optional().default(""),
  descripcionMacroscopica: z.string().optional().default(""),
  diagnosticoPresuntivo: z.string().optional().default(""),
  /** ISO "yyyy-mm-dd" */
  fechaToma: z
    .string({ required_error: "La fecha de toma es obligatoria" })
    .min(1, "La fecha de toma es obligatoria"),
  idMedicoResponsable: z
    .string({ required_error: "Indica el médico responsable" })
    .min(1, "Indica el médico responsable"),
  observaciones: z.string().optional().default(""),
});

export type BiopsiaFormInput = z.input<typeof BiopsiaFormSchema>;
export type BiopsiaFormValues = z.output<typeof BiopsiaFormSchema>;
