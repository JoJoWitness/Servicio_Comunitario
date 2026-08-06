/**
 * Interceptor global de respuestas 401.
 *
 * El `httpClient` llama a `notifyUnauthorized()` cada vez que recibe un 401.
 * El handler se registra UNA SOLA VEZ desde el router (donde se tiene acceso
 * a la navegación de React Router y al Store_Sesion).
 *
 * Esto evita que el handler quede pendiente de una importación circular entre
 * el httpClient y el store de sesión.
 *
 * Requisitos: 5.1, 5.2
 */

type UnauthorizedHandler = () => void;

let _handler: UnauthorizedHandler | null = null;

/**
 * Registra el callback que se ejecuta ante un 401.
 * Debe llamarse una sola vez durante la inicialización del router.
 *
 * El handler típicamente:
 * 1. Llama a `sessionStore.getState().limpiar()`
 * 2. Navega a `/login` con `navigate("/login", { replace: true })`
 *
 * @param handler - Función sin argumentos que limpia sesión y redirige
 */
export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  _handler = handler;
}

/**
 * Invocado por `httpClient` ante cualquier respuesta con status 401.
 * Si no hay handler registrado (ej. durante tests sin router), no hace nada.
 */
export function notifyUnauthorized(): void {
  _handler?.();
}
