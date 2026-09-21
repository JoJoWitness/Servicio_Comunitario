/**
 * Validación del formulario de la muestra (registro y edición de datos).
 * Las transiciones de estado (envío, resultado, entrega) validan sus propios
 * campos en el diálogo que las dispara; aquí va lo que describe la muestra.
 */

import { z } from "zod";
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
} from "../catalogosBiopsia";

/** Enum de Zod con "" como "sin indicar", para los `Select` del formulario. */
function opcional<V extends string>(lista: readonly { value: V }[]) {
  const valores = ["", ...lista.map((o) => o.value)] as [string, ...string[]];
  return z.enum(valores).optional().default("");
}

function lista<V extends string>(opciones: readonly { value: V }[]) {
  const valores = opciones.map((o) => o.value) as [V, ...V[]];
  return z.array(z.enum(valores)).optional().default([]);
}

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

  // Solicitud de biopsia (v0.5.0). Todo opcional.
  tipoBiopsia: opcional(TIPOS_BIOPSIA),
  tipoCitologia: opcional(TIPOS_CITOLOGIA),
  centroToma: z
    .enum(CENTROS_TOMA.map((o) => o.value) as [string, ...string[]])
    .optional()
    .default("hcsc"),
  centroTomaOtro: z.string().optional().default(""),
  tipoMuestra: opcional(TIPOS_MUESTRA),
  tipoMuestraOtro: z.string().optional().default(""),
  ubicacion: lista(UBICACIONES),
  bordes: opcional(BORDES),
  color: lista(COLORES),
  colorOtro: z.string().optional().default(""),
  tamano: opcional(TAMANOS),
  tamanoOtro: z.string().optional().default(""),
  altura: opcional(ALTURAS),
  cambiosAsociados: lista(CAMBIOS_ASOCIADOS),
  /** "" sin indicar, "si" o "no". */
  tratamientosPrevios: z.enum(["", "si", "no"]).optional().default(""),
  tratamientosPreviosCual: z.string().optional().default(""),
});

export type BiopsiaFormInput = z.input<typeof BiopsiaFormSchema>;
export type BiopsiaFormValues = z.output<typeof BiopsiaFormSchema>;
