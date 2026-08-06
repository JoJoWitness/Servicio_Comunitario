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
import { AppRouter } from "./routes/router";

function AppInner() {
  const limpiar = useSessionStore((s) => s.limpiar);
  const { isError, error, isPending } = useValidateUser();

  useEffect(() => {
    if (isPending) return;
    if (!isError) return;
    limpiar();
  }, [isError, error, isPending, limpiar]);

  return <AppRouter />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
