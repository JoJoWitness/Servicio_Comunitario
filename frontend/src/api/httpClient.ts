/**
 * Punto único de salida HTTP de la Capa_API.
 *
 * Responsabilidades (Requisitos 1.1–1.5, 5.1):
 * 1. Construir la URL concatenando BASE_URL + path.
 * 2. Incluir `credentials: 'include'` en cada petición.
 * 3. Serializar el body a JSON cuando esté presente.
 * 4. Determinar éxito/error ÚNICAMENTE por `response.status` —
 *    el encabezado `Status-Code` del backend se ignora por completo.
 * 5. Ante error, leer el cuerpo con `response.text()` y lanzar `ApiError`.
 * 6. Ante 401, disparar el `Interceptor_401` antes de lanzar el error,
 *    EXCEPTO si el path es de login (para no redirigir en credenciales inválidas).
 */

import { BASE_URL } from "./config";
import { ApiError } from "./errors";
import { notifyUnauthorized } from "./interceptor";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Helper: construir URL
// ---------------------------------------------------------------------------

/**
 * Une BASE_URL y path asegurando exactamente una barra entre ambos.
 * Nunca añade doble barra ni elimina barras internas del path.
 */
function buildUrl(path: string): string {
  const base = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

// ---------------------------------------------------------------------------
// request<T>
// ---------------------------------------------------------------------------

/**
 * Realiza una petición HTTP a la API.
 *
 * - Éxito (2xx): parsea el cuerpo como JSON y lo devuelve tipado como `T`.
 *   Si el cuerpo está vacío (204 / respuestas sin contenido), devuelve `undefined`.
 * - Error (4xx / 5xx): lanza `ApiError` con el status real y el cuerpo en texto plano.
 *
 * @param path    - Path relativo al backend, ej. `/auth/login`
 * @param options - Método, body y señal de cancelación opcionales
 * @throws {ApiError} ante cualquier respuesta con status >= 400
 */
export async function request<T = void>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(buildUrl(path), {
    method,
    credentials: "include", // Requisito 1.1
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  // Requisitos 1.3, 1.4: éxito/error solo por response.status
  if (!response.ok) {
    // Requisito 1.5: leer cuerpo de error como texto plano
    const errorBody = await response.text();

    // Requisito 5.1: notificar el interceptor ante 401.
    // Excepción: el endpoint /auth/login usa 401 para credenciales inválidas,
    // no para sesión expirada — el handler del interceptor es quien decide
    // si navegar o no (el caller del login debe capturar el ApiError y
    // no dejar que el interceptor lo procese si está en la pantalla de login).
    // La lógica de excepción queda en manos del handler registrado, no aquí.
    if (response.status === 401) {
      notifyUnauthorized();
    }

    throw new ApiError(response.status, errorBody);
  }

  // Respuestas sin cuerpo (204, DELETE exitoso, etc.)
  const contentType = response.headers.get("content-type") ?? "";
  if (
    response.status === 204 ||
    !contentType.includes("application/json")
  ) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
