/**
 * Parseo del encabezado `Content-Disposition` para extraer el nombre de archivo.
 *
 * Requisitos 26.4, 26.5:
 * - Cuando la respuesta de exportación tiene estado 200, leer el nombre del
 *   archivo del encabezado `Content-Disposition`.
 * - Si el encabezado no contiene un `filename`, usar un nombre por defecto.
 */

/** Nombre de archivo por defecto si el encabezado no lo incluye */
const DEFAULT_FILENAME = "record-quirurgico.xlsx";

// ---------------------------------------------------------------------------
// Parser principal
// ---------------------------------------------------------------------------

/**
 * Extrae el nombre de archivo del encabezado `Content-Disposition`.
 *
 * Soporta dos formas comunes:
 * - `attachment; filename="nombre.xlsx"`
 * - `attachment; filename*=UTF-8''nombre%20archivo.xlsx` (RFC 5987)
 *
 * Devuelve `DEFAULT_FILENAME` si el encabezado es nulo, vacío o no contiene
 * un nombre de archivo válido.
 *
 * @param header - Valor del encabezado `Content-Disposition` (puede ser null)
 * @returns Nombre del archivo a usar en la descarga
 *
 * @example
 * parseFilename('attachment; filename="reporte.xlsx"')  // "reporte.xlsx"
 * parseFilename('attachment; filename*=UTF-8\'\'reporte.xlsx') // "reporte.xlsx"
 * parseFilename(null)                                          // "record-quirurgico.xlsx"
 * parseFilename('')                                            // "record-quirurgico.xlsx"
 */
export function parseFilename(header: string | null): string {
  if (!header) {
    return DEFAULT_FILENAME;
  }

  // Intentar primero `filename*` (RFC 5987, tiene precedencia)
  const rfc5987Match = header.match(
    /filename\*\s*=\s*(?:[Uu][Tt][Ff]-8''|[Uu][Tt][Ff]8'')([^\s;]+)/i
  );
  if (rfc5987Match?.[1]) {
    try {
      const decoded = decodeURIComponent(rfc5987Match[1]);
      if (decoded) return decoded;
    } catch {
      // decodificación fallida → caer al siguiente intento
    }
  }

  // Intentar `filename` con o sin comillas
  const filenameMatch = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  if (filenameMatch?.[1]) {
    const name = filenameMatch[1].trim();
    if (name) return name;
  }

  return DEFAULT_FILENAME;
}
