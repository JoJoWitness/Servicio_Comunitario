/**
 * Componente raíz de la aplicación.
 *
 * Responsabilidades:
 * 1. Aplica el tema (light/dark/system) inyectando la clase `dark` en <html>.
 * 2. Rehidratación de sesión al iniciar — llama a GET /auth/validateUser
 *    y actualiza el Store_Sesion (Requisito 4.1–4.4).
 * 3. Renderiza el router principal con todas las rutas y guardias.
 */

import { useEffect } from "react";
import { ThemeProvider } from "./components/ThemeProvider";
import { useValidateUser } from "./hooks/useAuth";
import { useSessionStore } from "./stores/sessionStore";
import { useConexionStore } from "./stores/conexionStore";
import { useSincronizacionAutomatica } from "./offline/useSincronizacion";
import { usePrecargaAutomatica } from "./offline/usePrecarga";
import { isRedError } from "./api/errors";
import { AppRouter } from "./routes/router";

function AppInner() {
  const limpiar = useSessionStore((s) => s.limpiar);
  const marcarModoOffline = useSessionStore((s) => s.marcarModoOffline);
  const sesionLocalVigente = useSessionStore((s) => s.sesionLocalVigente);
  const iniciarVigilancia = useConexionStore((s) => s.iniciarVigilancia);
  const forzadoSinConexion = useConexionStore((s) => s.forzadoSinConexion);
  const simularSinConexion = useConexionStore((s) => s.simularSinConexion);
  const { isError, error, isPending } = useValidateUser();

  // Vigilancia de la conexión: arranca con la aplicación y vive tanto como ella.
  useEffect(() => iniciarVigilancia(), [iniciarVigilancia]);

  // Sube sola lo que haya pendiente en cuanto vuelva la red.
  useSincronizacionAutomatica();

  // Baja catálogos, equipo y pacientes para trabajar sin red.
  usePrecargaAutomatica();

  useEffect(() => {
    if (isPending) return;
    if (!isError) return;

    // Distinguir aquí es lo que sostiene el trabajo sin conexión.
    //
    // Un 401 es el servidor diciendo que la sesión murió: hay que cerrarla y
    // mandar al login. Pero un fallo de red no dice nada sobre la sesión, solo
    // que no se pudo preguntar. Tratarlo igual expulsaría al médico de la
    // aplicación justo cuando se queda sin señal —con notas a medio escribir y
    // sin poder volver a entrar, porque el login también necesita servidor—.
    // Mientras la sesión guardada siga en plazo, se continúa en modo offline.
    if (isRedError(error) && sesionLocalVigente()) {
      marcarModoOffline();
      return;
    }

    limpiar();
  }, [isError, error, isPending, limpiar, marcarModoOffline, sesionLocalVigente]);

  return (
    <>
      <AppRouter />

      {/*
        Interruptor de prueba de conexión — SOLO desarrollo, y escrito aquí
        mismo (sin componente aparte) para que no dependa de ningún import que
        el hot-reload pueda dejar a medias. Simula "sin servidor" de forma
        determinista: en local, frontend y backend viven en la misma máquina,
        así que apagar el wifi no corta nada. En el build de producción este
        bloque no existe (`import.meta.env.DEV`).
      */}
      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={() => simularSinConexion(!forzadoSinConexion)}
          title="Solo en desarrollo: simula que no hay servidor"
          style={{
            position: "fixed",
            bottom: 12,
            right: 12,
            zIndex: 99999,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px dashed",
            borderColor: forzadoSinConexion ? "#f59e0b" : "#9ca3af",
            background: forzadoSinConexion ? "#f59e0b" : "#111827",
            color: forzadoSinConexion ? "#111827" : "#e5e7eb",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {forzadoSinConexion
            ? "🔌 SIN conexión — clic para reconectar"
            : "🧪 Simular sin conexión"}
        </button>
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
