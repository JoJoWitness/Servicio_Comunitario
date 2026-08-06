/**
 * Utilidades de fecha/hora para la comunicación con el backend.
 *
 * Reglas del backend (Requisitos 1.6, 1.7):
 * - Todos los campos de fecha/hora se envían en formato RFC3339.
 * - Los campos `hora_comienzo` y `hora_culminacion` se envían con una parte de
 *   fecha fija (FIXED_DATE), ya que el backend ignora la fecha en esos campos.
 * - En el dominio, las horas se representan como cadenas "HH:mm".
 */

/**
 * Fecha fija usada como base para los campos de hora cuando el backend
 * ignora la parte de fecha. Se usa una fecha arbitraria y constante para
 * que el round-trip sea determinista.
 */
const FIXED_DATE = "2000-01-01";

// ---------------------------------------------------------------------------
// Formato RFC3339
// ---------------------------------------------------------------------------

/**
 * Formatea un objeto `Date` a cadena RFC3339 con zona UTC (terminada en `Z`).
 *
 * @example
 * formatRFC3339(new Date("2026-07-20T14:30:00Z")) // "2026-07-20T14:30:00.000Z"
 */
export function formatRFC3339(date: Date): string {
  return date.toISOString();
}

/**
 * Parsea una cadena RFC3339 a un objeto `Date`.
 * Lanza un `RangeError` si la cadena no produce una fecha válida.
 *
 * @example
 * parseRFC3339("2026-07-20T14:30:00Z") // Date(2026-07-20T14:30:00.000Z)
 */
export function parseRFC3339(value: string): Date {
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new RangeError(`Cadena RFC3339 inválida: "${value}"`);
  }
  return d;
}

// ---------------------------------------------------------------------------
// Manejo de horas "HH:mm" ↔ RFC3339 con fecha fija
// ---------------------------------------------------------------------------

/**
 * Convierte una cadena "HH:mm" a RFC3339 usando `FIXED_DATE` como fecha base.
 * El backend ignora la parte de fecha en los campos de hora, por lo que usar
 * una fecha fija garantiza consistencia en el round-trip.
 *
 * Requisito 1.7: Los campos `hora_comienzo` y `hora_culminacion` se envían
 * con una parte de fecha fija.
 *
 * @example
 * horaToRFC3339("14:30") // "2000-01-01T14:30:00.000Z"
 */
export function horaToRFC3339(hora: string): string {
  const [hh, mm] = hora.split(":").map(Number);
  if (
    hh === undefined ||
    mm === undefined ||
    isNaN(hh) ||
    isNaN(mm) ||
    hh < 0 ||
    hh > 23 ||
    mm < 0 ||
    mm > 59
  ) {
    throw new RangeError(`Formato de hora inválido: "${hora}". Se esperaba "HH:mm".`);
  }
  const hhStr = String(hh).padStart(2, "0");
  const mmStr = String(mm).padStart(2, "0");
  return new Date(`${FIXED_DATE}T${hhStr}:${mmStr}:00.000Z`).toISOString();
}

/**
 * Extrae la parte "HH:mm" de una cadena RFC3339 (ignorando la fecha).
 * Usa el tiempo UTC para mantener consistencia con `horaToRFC3339`.
 *
 * @example
 * horaFromRFC3339("2000-01-01T14:30:00Z") // "14:30"
 * horaFromRFC3339("2026-07-20T08:05:00Z") // "08:05"
 */
export function horaFromRFC3339(value: string): string {
  const d = parseRFC3339(value);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// ---------------------------------------------------------------------------
// Comparación de horas para validación (Requisito 14.5)
// ---------------------------------------------------------------------------

/**
 * Compara dos horas en formato "HH:mm".
 * Devuelve `true` si `horaFin` es estrictamente anterior a `horaInicio`.
 * Usado por la validación de la nota para evitar `horaCulminacion < horaComienzo`.
 *
 * @example
 * esCulminacionAnterior("10:00", "09:30") // true  → inválido
 * esCulminacionAnterior("10:00", "10:00") // false → válido (misma hora)
 * esCulminacionAnterior("10:00", "11:00") // false → válido
 */
export function esCulminacionAnterior(
  horaComienzo: string,
  horaCulminacion: string
): boolean {
  const toMinutes = (h: string) => {
    const [hh, mm] = h.split(":").map(Number);
    return (hh ?? 0) * 60 + (mm ?? 0);
  };
  return toMinutes(horaCulminacion) < toMinutes(horaComienzo);
}

// ---------------------------------------------------------------------------
// Formateo para visualización
// ---------------------------------------------------------------------------

/**
 * Formatea una fecha para mostrar en la UI (DD/MM/YYYY), usando la zona UTC
 * para evitar desplazamientos de día por zona horaria local.
 *
 * @example
 * formatFechaUI(new Date("2026-07-20T00:00:00Z")) // "20/07/2026"
 */
export function formatFechaUI(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
