/**
 * Modelo de error de la Capa_API y clasificadores de respuestas de error.
 *
 * El backend envía cuerpos de error en texto plano (no JSON), por lo que
 * `ApiError.body` es siempre una cadena leída con `response.text()`.
 *
 * Requisitos: 1.5, 21.4, 23.4
 */

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

/**
 * Error normalizado de la Capa_API.
 *
 * - `status` → siempre `response.status` (nunca el encabezado `Status-Code`)
 * - `body`   → cuerpo de la respuesta leído con `response.text()`
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`ApiError ${status}: ${body}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    // Mantener el prototipo correcto en entornos que transpilan clases ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// RedError — no hubo respuesta
// ---------------------------------------------------------------------------

/**
 * La petición nunca llegó a destino: no hay red, el servidor no responde o se
 * agotó el tiempo de espera.
 *
 * Es la distinción que sostiene todo el trabajo sin conexión. Un `ApiError` es
 * el servidor diciendo que no (el equipo quirúrgico es inválido, la sesión
 * expiró): reintentar sin cambiar nada dará el mismo resultado, así que se le
 * muestra al médico. Un `RedError` no es un juicio sobre la nota, sino sobre el
 * momento: la misma petición funcionará cuando vuelva la señal, y por eso lo que
 * corresponde es guardar en la cola y seguir, no molestar con un error.
 */
export class RedError extends Error {
  readonly causa?: unknown;

  constructor(causa?: unknown) {
    super("No hay conexión con el servidor");
    this.name = "RedError";
    this.causa = causa;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Comprueba si un error capturado es un `RedError`. */
export function isRedError(error: unknown): error is RedError {
  return error instanceof RedError;
}

// ---------------------------------------------------------------------------
// Clasificador de errores 403 de notas (Requisitos 21.4, 23.4)
// ---------------------------------------------------------------------------

/**
 * Motivo de un `403` devuelto por el backend al editar o eliminar una nota.
 *
 * - `fuera_de_plazo`   → la Ventana_Edicion de 7 días ha expirado
 * - `no_participante`  → el usuario no participó en la intervención
 * - `desconocido`      → cualquier otro texto de error
 */
export type Nota403Motivo = "fuera_de_plazo" | "no_participante" | "desconocido";

/**
 * Clasifica el cuerpo de texto plano de un error `403` de nota para mostrar
 * mensajes diferenciados al usuario.
 *
 * Heurística sobre el texto del backend (puede ajustarse si el backend cambia):
 * - Palabras clave de plazo:  "plazo", "7 días", "7 dias", "tiempo", "expirado", "expired", "window"
 * - Palabras clave de no participante: "participante", "participant", "unauthorized", "not authorized"
 *
 * @param body - Cuerpo de error en texto plano (`ApiError.body`)
 * @returns El motivo clasificado
 */
export function clasificar403Nota(body: string): Nota403Motivo {
  const texto = body.toLowerCase();

  const esPlazo =
    texto.includes("plazo") ||
    texto.includes("7 d") ||      // "7 días", "7 dias"
    texto.includes("tiempo") ||
    texto.includes("expirad") ||  // "expirado", "expirada"
    texto.includes("expired") ||
    texto.includes("window");

  if (esPlazo) return "fuera_de_plazo";

  const esNoParticipante =
    texto.includes("participante") ||
    texto.includes("participant") ||
    texto.includes("not authorized") ||
    texto.includes("no autorizado") ||
    texto.includes("no particip");

  if (esNoParticipante) return "no_participante";

  return "desconocido";
}

// ---------------------------------------------------------------------------
// Guard de tipo
// ---------------------------------------------------------------------------

/** Comprueba si un error capturado es un `ApiError`. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
