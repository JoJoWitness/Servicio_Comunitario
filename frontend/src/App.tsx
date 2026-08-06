/**
 * Componente raíz de la aplicación.
 *
 * Responsabilidades:
 * 1. Rehidratación de sesión al iniciar — llama a GET /auth/validateUser
 *    y actualiza el Store_Sesion (Requisito 4.1–4.4).
 * 2. Renderiza el router principal con todas las rutas y guardias.
 *
 * El estado "cargando" inicial del Store_Sesion hace que RequireAuth
 * muestre un spinner hasta que la validación termine (Requisito 4.4).
 */

import { useValidateUser } from "./hooks/useAuth";
import { AppRouter } from "./routes/router";

function AppInner() {
  // Dispara GET /auth/validateUser una sola vez al montar.
  // El hook actualiza el Store_Sesion con el perfil o lo limpia ante 401.
  // Requisitos 4.1, 4.2, 4.3
  useValidateUser();

  return <AppRouter />;
}

export default function App() {
  return <AppInner />;
}
