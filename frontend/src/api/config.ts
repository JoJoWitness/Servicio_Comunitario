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
/**
 * Por qué en la web también se usa "/api" y no la URL de Render: la sesión
 * viaja en cookie. Si la página vive en vercel.app y la API en onrender.com,
 * esa cookie es "de terceros" y los navegadores con ese bloqueo activo (cada
 * vez más, por defecto) la descartan: el login responde 200 y la sesión nunca
 * se guarda. Con el rewrite de vercel.json (/api/* → Render) el navegador solo
 * habla con vercel.app, la cookie es de primera parte y nadie tiene que tocar
 * su configuración. El binario de Tauri sí necesita la URL absoluta (no hay
 * proxy delante), y la recibe por VITE_API_URL en el workflow de release.
 */
const API_POR_DEFECTO = "https://servicio-comunitario-7ye5.onrender.com";

function baseEnProduccion(): string {
  const configurada = import.meta.env.VITE_API_URL as string | undefined;
  if (configurada) return configurada;
  // Servido desde Vercel sin URL configurada: pasar por el rewrite.
  if (typeof window !== "undefined" && window.location.hostname.endsWith(".vercel.app")) {
    return "/api";
  }
  return API_POR_DEFECTO;
}

export const BASE_URL: string = import.meta.env.DEV ? "/api" : baseEnProduccion();
