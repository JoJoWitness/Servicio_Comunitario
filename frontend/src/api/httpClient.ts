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

import { haySinConexion, useConexionStore } from "@/stores/conexionStore";
import { BASE_URL } from "./config";
import { ApiError, RedError } from "./errors";
import { notifyUnauthorized } from "./interceptor";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /**
   * Cuerpo de la petición. Un objeto se serializa a JSON; un `Blob` viaja tal
   * cual con su propio `Content-Type` (la imagen de la cédula).
   */
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
// Helper: fetch que distingue "sin red" de "el servidor respondió mal"
// ---------------------------------------------------------------------------

/**
 * Envuelve `fetch` traduciendo su fallo a `RedError`.
 *
 * `fetch` solo rechaza cuando no hubo respuesta: DNS que no resuelve, conexión
 * rechazada, timeout. Un 500 o un 401 llegan como respuesta normal. Esa
 * frontera es exactamente la que separa "la nota se encola y se sube después"
 * de "hay que avisarle al médico", así que se marca aquí con un tipo propio en
 * vez de dejar que cada llamador interprete un `TypeError` genérico.
 *
 * De paso avisa al Store_Conexion: la primera petición que falla es la señal
 * más temprana de que se cayó la red, mucho antes de que lo note el sondeo
 * periódico a /health.
 */
/**
 * En modo sin conexión la petición no sale. Importa cuando el servidor sí es
 * alcanzable (simulador de desarrollo, o red recuperada antes del sondeo): sin
 * cookie válida respondería 401 y el Interceptor_401 cerraría la sesión.
 */
function cortarSiNoHayServidor(): void {
  if (haySinConexion()) {
    throw new RedError(new Error("La aplicación está en modo sin conexión"));
  }
}

async function fetchOFallarPorRed(
  url: string,
  init: RequestInit
): Promise<Response> {
  cortarSiNoHayServidor();

  try {
    return await fetch(url, init);
  } catch (error) {
    // Una cancelación deliberada (cambio de pantalla, búsqueda que se
    // reescribe) no es un problema de red: se deja pasar tal cual.
    if (error instanceof DOMException && error.name === "AbortError") throw error;

    useConexionStore.getState().marcarSinConexion();
    throw new RedError(error);
  }
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
  let cuerpo: BodyInit | undefined;
  if (body instanceof Blob) {
    if (body.type) headers["Content-Type"] = body.type;
    cuerpo = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    cuerpo = JSON.stringify(body);
  }

  const response = await fetchOFallarPorRed(buildUrl(path), {
    method,
    credentials: "include", // Requisito 1.1
    headers,
    body: cuerpo,
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

    throw new ApiError(
      response.status,
      errorBody,
      response.headers.get("X-Motivo") ?? undefined
    );
  }

  // Respuestas sin cuerpo o con texto plano (204, DELETE, respuestas no-JSON)
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 204 || !contentType.includes("application/json")) {
    return undefined as T;
  }

  // Parsear JSON con fallback a undefined si el backend envía texto plano
  // con Content-Type: application/json (bug conocido en algunos endpoints Go)
  const text = await response.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    // El backend envió texto plano con cabecera JSON — tratar como éxito sin datos
    return undefined as T;
  }
}

// ---------------------------------------------------------------------------
// requestBlob — descargas de archivos
// ---------------------------------------------------------------------------

/**
 * Igual que `request`, pero para respuestas binarias (el .xlsx del record
 * quirúrgico). Devuelve el contenido y el nombre que propone el servidor en
 * `Content-Disposition`.
 *
 * Los errores se leen como texto y se lanzan como `ApiError`, igual que en
 * `request`: el backend responde el motivo en texto plano aunque la petición
 * esperara un archivo.
 *
 * @throws {ApiError} ante cualquier respuesta con status >= 400
 */
export async function requestBlob(
  path: string,
  options: { signal?: AbortSignal } = {}
): Promise<{ blob: Blob; contentDisposition: string | null }> {
  const response = await fetchOFallarPorRed(buildUrl(path), {
    method: "GET",
    credentials: "include",
    signal: options.signal,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status === 401) {
      notifyUnauthorized();
    }
    throw new ApiError(
      response.status,
      errorBody,
      response.headers.get("X-Motivo") ?? undefined
    );
  }

  return {
    blob: await response.blob(),
    contentDisposition: response.headers.get("Content-Disposition"),
  };
}
