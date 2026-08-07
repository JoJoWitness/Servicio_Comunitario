import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  // Vite expone las variables de `.env` al cliente como `import.meta.env`, pero
  // NO las carga en `process.env`, que es lo único que ve este archivo. Sin
  // `loadEnv`, poner VITE_API_URL en `.env` no tiene ningún efecto sobre el
  // proxy: se cae al backend desplegado y el servidor local nunca recibe nada.
  const env = loadEnv(mode, process.cwd(), "");
  const backend =
    env.VITE_API_URL ?? "https://servicio-comunitario-7ye5.onrender.com";

  return {
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 4321,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    // Proxy temporal para evitar errores CORS mientras el backend nos agrega
    // a su lista blanca. Solo activo en desarrollo (el bloque `server` de Vite
    // no se aplica en producción ni en el binario de Tauri).
    // Las peticiones a /api/* se reescriben quitando el prefijo y se reenvían
    // al backend real con changeOrigin:true para falsificar el header Host.
    proxy: {
      "/api": {
        target: backend,
        changeOrigin: true,
        // Reescribir las cookies para que el navegador las acepte desde localhost
        cookieDomainRewrite: "localhost",
        // Permitir cookies sobre conexión no-HTTPS en desarrollo
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  };
});
