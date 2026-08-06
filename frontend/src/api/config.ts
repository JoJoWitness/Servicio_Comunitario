/**
 * Base URL del backend. Se resuelve desde la variable de entorno VITE_API_URL
 * y cae al valor por defecto si no está definida.
 */
export const BASE_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:8080";
