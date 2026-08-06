/**
 * Base URL del backend.
 *
 * En desarrollo: se usa "/api" para que el proxy de Vite intercepte las
 * peticiones y las reenvíe al backend real evitando errores de CORS.
 * El proxy está configurado en vite.config.ts → server.proxy.
 *
 * En producción (build de Tauri): la WebView hace las peticiones directamente
 * a la URL del backend sin proxy, por lo que VITE_API_URL debe apuntar a la
 * URL real del servidor.
 */
export const BASE_URL: string = import.meta.env.DEV
  ? "/api"
  : (import.meta.env.VITE_API_URL ?? "https://servicio-comunitario-7ye5.onrender.com");
