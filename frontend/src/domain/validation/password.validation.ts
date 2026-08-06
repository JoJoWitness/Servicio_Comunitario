/**
 * Validación del cambio de contraseña (Requisitos 8.3, 8.4).
 *
 * Reglas:
 * 1. La contraseña nueva debe tener al menos 8 caracteres.
 * 2. La contraseña nueva no puede ser igual a la actual.
 *
 * Integración con shadcn/ui: se exporta el schema de Zod para usar con
 * `react-hook-form` + `@hookform/resolvers/zod` en el formulario de cambio.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schema de Zod
// ---------------------------------------------------------------------------

export const ChangePasswordSchema = z
  .object({
    /** Contraseña actual del usuario */
    actual: z.string().min(1, "Ingresa tu contraseña actual"),
    /** Nueva contraseña — mínimo 8 caracteres */
    nueva: z
      .string()
      .min(8, "La contraseña nueva debe tener al menos 8 caracteres"),
  })
  .refine((data) => data.nueva !== data.actual, {
    message: "La contraseña nueva no puede ser igual a la actual",
    path: ["nueva"],
  });

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// ---------------------------------------------------------------------------
// Función de validación pura (usable fuera de formularios, ej. en tests)
// ---------------------------------------------------------------------------

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; errores: string[] };

/**
 * Valida las reglas de cambio de contraseña.
 *
 * Devuelve `{ ok: true }` si ambas reglas se cumplen, o
 * `{ ok: false, errores: string[] }` con los mensajes de fallo.
 *
 * Requisito 8.3: falla si `nueva` tiene menos de 8 caracteres.
 * Requisito 8.4: falla si `nueva === actual`.
 *
 * @example
 * validarPassword("abc123", "abc1234")  // { ok: false, errores: [...] }
 * validarPassword("abc123", "abc12345") // { ok: true }
 * validarPassword("abc123", "abc123")   // { ok: false, errores: [...] }
 */
export function validarPassword(
  actual: string,
  nueva: string
): PasswordValidationResult {
  const result = ChangePasswordSchema.safeParse({ actual, nueva });

  if (result.success) {
    return { ok: true };
  }

  const errores = result.error.errors.map((e) => e.message);
  return { ok: false, errores };
}
