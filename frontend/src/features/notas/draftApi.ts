/**
 * DraftApi — Borrador_Local sobre localStorage.
 *
 * Persiste un borrador de nota en el dispositivo local, asociado al usuario
 * y al paciente. Nunca se envía al backend (Requisito 15.4).
 *
 * Clave: `draft:nota:{userId}:{pacienteId}`
 *
 * Requisitos: 15.1, 15.2, 15.3, 15.4
 */

import type { NotaFormInput } from "@/domain/validation/nota.validation";

type DraftData = Partial<NotaFormInput>;

// ---------------------------------------------------------------------------
// Clave de almacenamiento
// ---------------------------------------------------------------------------

function buildKey(userId: string, pacienteId: string): string {
  return `draft:nota:${userId}:${pacienteId}`;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Guarda (o sobreescribe) el borrador en localStorage.
 * Requisito 15.1
 */
export function saveDraft(
  userId: string,
  pacienteId: string,
  borrador: DraftData
): void {
  try {
    localStorage.setItem(buildKey(userId, pacienteId), JSON.stringify(borrador));
  } catch {
    // localStorage lleno o no disponible — ignorar silenciosamente
  }
}

/**
 * Carga el borrador guardado, o devuelve `null` si no existe.
 * Requisito 15.2
 */
export function loadDraft(
  userId: string,
  pacienteId: string
): DraftData | null {
  try {
    const raw = localStorage.getItem(buildKey(userId, pacienteId));
    if (!raw) return null;
    return JSON.parse(raw) as DraftData;
  } catch {
    return null;
  }
}

/**
 * Elimina el borrador guardado.
 * Se llama al guardar con éxito en el backend (Requisito 15.3).
 */
export function clearDraft(userId: string, pacienteId: string): void {
  try {
    localStorage.removeItem(buildKey(userId, pacienteId));
  } catch {
    // ignorar
  }
}
