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

// ---------------------------------------------------------------------------
// Rangos relativos (accesos rápidos de exportación)
// ---------------------------------------------------------------------------

/** Formatea una fecha local como "yyyy-mm-dd", sin pasar por UTC. */
export function aISOLocal(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Rango que va de hace `meses` meses hasta hoy, ambos incluidos.
 *
 * Retroceder meses en JavaScript desborda cuando el día no existe en el mes
 * destino: al 31 de marzo menos un mes le corresponde el 3 de marzo, no el 28
 * de febrero. Aquí se corrige llevándolo al último día del mes anterior.
 *
 * @example
 * rangoUltimosMeses(1) // desde el mismo día del mes pasado hasta hoy
 */
export function rangoUltimosMeses(
  meses: number,
  hoy: Date = new Date()
): { from: string; to: string } {
  const desde = new Date(hoy);
  const dia = desde.getDate();
  desde.setMonth(desde.getMonth() - meses);
  if (desde.getDate() !== dia) desde.setDate(0);

  return { from: aISOLocal(desde), to: aISOLocal(hoy) };
}

// ---------------------------------------------------------------------------
// Fecha corta "dd/mm/aa" ↔ ISO "yyyy-mm-dd"  (entrada manual del usuario)
// ---------------------------------------------------------------------------

/**
 * Resuelve un año de dos dígitos a un año de cuatro dígitos.
 *
 * Se usa una ventana móvil: los años hasta 10 por encima del actual se
 * interpretan como del siglo en curso, y el resto como del siglo anterior.
 * En 2026 eso significa 00–36 → 2000–2036 y 37–99 → 1937–1999, lo que cubre
 * tanto fechas de nacimiento antiguas como fechas de notas a futuro cercano.
 */
export function anioDesdeDosDigitos(yy: number): number {
  const anioActual = new Date().getFullYear();
  const siglo = Math.floor(anioActual / 100) * 100;
  const limite = (anioActual % 100) + 10;
  return yy <= limite ? siglo + yy : siglo - 100 + yy;
}

/**
 * Convierte una fecha ISO "yyyy-mm-dd" al formato corto "dd/mm/aa".
 * Devuelve cadena vacía si la entrada no es una fecha ISO completa.
 *
 * @example
 * isoAFechaCorta("2026-07-20") // "20/07/26"
 */
export function isoAFechaCorta(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return "";
  const [, yyyy, mm, dd] = m;
  return `${dd}/${mm}/${yyyy.slice(2)}`;
}

/**
 * Convierte una fecha corta "dd/mm/aa" a ISO "yyyy-mm-dd".
 * Devuelve `null` si el texto está incompleto o el día no existe en ese mes
 * (p. ej. "31/02/26").
 *
 * @example
 * fechaCortaAISO("20/07/26") // "2026-07-20"
 * fechaCortaAISO("31/02/26") // null
 */
export function fechaCortaAISO(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(texto.trim());
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = anioDesdeDosDigitos(Number(m[3]));
  if (mm < 1 || mm > 12 || dd < 1) return null;
  // Día 0 del mes siguiente = último día del mes actual.
  const diasDelMes = new Date(Date.UTC(yyyy, mm, 0)).getUTCDate();
  if (dd > diasDelMes) return null;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/**
 * Aplica la máscara "dd/mm/aa" sobre lo que el usuario va escribiendo:
 * conserva solo dígitos (máx. 6) e inserta las barras automáticamente.
 */
export function aplicarMascaraFechaCorta(entrada: string): string {
  const digitos = entrada.replace(/\D/g, "").slice(0, 6);
  const partes = [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4, 6)];
  return partes.filter((p) => p.length > 0).join("/");
}
