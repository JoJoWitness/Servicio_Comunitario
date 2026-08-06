/**
 * Guardias de ruta — autenticación y autorización por rol.
 *
 * `RequireAuth`  → redirige a /login si no hay sesión; muestra carga mientras
 *                  la rehidratación está en curso (Requisitos 4.4, 7.1)
 * `RequireRole`  → redirige a la vista permitida si el rol no está autorizado
 *                  (Requisitos 7.2, 7.3, 13.1, 13.3, 19.3, 27.1, 28.6)
 *
 * Ambas se componen en el router:
 * ```tsx
 * <RequireAuth>
 *   <RequireRole roles={["admin"]}>
 *     <AdminPage />
 *   </RequireRole>
 * </RequireAuth>
 * ```
 */

import { Navigate, useLocation } from "react-router-dom";
import type { Rol } from "../domain/models";
import { useSessionStore } from "../stores/sessionStore";
import { rutaInicialPorRol } from "./roleRoutes";

// ---------------------------------------------------------------------------
// RequireAuth
// ---------------------------------------------------------------------------

interface RequireAuthProps {
  children: React.ReactNode;
  /** Elemento a mostrar durante la rehidratación. Por defecto un spinner básico. */
  fallback?: React.ReactNode;
}

/**
 * Protege rutas que requieren sesión activa.
 *
 * - `estado === "cargando"` → muestra `fallback` (o spinner por defecto)
 * - `estado === "anonimo"`  → redirige a /login conservando la ruta de retorno
 * - `estado === "autenticado"` → renderiza los hijos
 *
 * Requisitos: 4.4, 7.1
 */
export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const estado = useSessionStore((s) => s.estado);
  const location = useLocation();

  if (estado === "cargando") {
    return (
      fallback ?? (
        <div
          role="status"
          aria-label="Verificando sesión"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
          }}
        >
          <span>Cargando...</span>
        </div>
      )
    );
  }

  if (estado === "anonimo") {
    // Guardar la ruta solicitada para redirigir tras el login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// RequireRole
// ---------------------------------------------------------------------------

interface RequireRoleProps {
  /** Roles autorizados para esta ruta */
  roles: Rol[];
  children: React.ReactNode;
}

/**
 * Protege rutas que requieren un rol específico.
 * Debe usarse dentro de `RequireAuth` (ya garantiza que hay perfil).
 *
 * Si el rol del usuario no está en `roles`, redirige a la pantalla inicial
 * permitida para su rol (en lugar de un 403 genérico).
 *
 * Requisitos: 7.2, 7.3, 13.1, 13.3, 19.3, 27.1, 28.6
 */
export function RequireRole({ roles, children }: RequireRoleProps) {
  const perfil = useSessionStore((s) => s.perfil);

  // perfil siempre existe aquí porque RequireAuth ya lo garantiza
  if (!perfil || !roles.includes(perfil.rol)) {
    const rutaPermitida = rutaInicialPorRol(perfil?.rol ?? "medico");
    return <Navigate to={rutaPermitida} replace />;
  }

  return <>{children}</>;
}
