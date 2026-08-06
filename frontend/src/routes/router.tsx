/**
 * Definición del router principal.
 *
 * Estructura de rutas (Requisito 7, diseño de enrutamiento):
 *
 * /login                        → LoginPage              (pública)
 * /signup/:token                → SignupPage             (pública — Req 9.5)
 * /                             → RequireAuth
 *   /mis-notas                  → MisNotasPage          (medico)
 *   /notas                      → TodasNotasPage        (secretaria, admin)
 *   /notas/:id                  → DetalleNotaPage       (todos los roles autenticados)
 *   /notas/nuevo                → FormNotaPage          (medico, admin)
 *   /notas/:id/editar           → FormNotaPage          (medico, admin)
 *   /pacientes                  → PacientesPage         (todos)
 *   /pacientes/:id              → FichaPacientePage     (todos)
 *   /catalogos                  → CatalogosPage         (admin)
 *   /usuarios                   → UsuariosPage          (admin)
 *   /perfil                     → PerfilPage            (todos — cambio contraseña)
 *   *                           → redirige a pantalla inicial por rol
 *
 * El interceptor 401 se registra aquí porque este componente tiene acceso
 * a `useNavigate` y al Store_Sesion — Requisitos 5.1, 5.2.
 *
 * Las páginas aún no existen (se crean en tareas 12–17); se usan placeholders
 * hasta que estén implementadas.
 */

import { lazy, Suspense, useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { registerUnauthorizedHandler } from "../api/interceptor";
import { useSessionStore } from "../stores/sessionStore";
import { RequireAuth, RequireRole } from "./guards";
import { rutaInicialPorRol } from "./roleRoutes";

// ---------------------------------------------------------------------------
// Páginas reales — lazy para code-splitting
// ---------------------------------------------------------------------------

const LoginPage         = lazy(() => import("../features/auth/LoginPage"));
const SignupPage        = lazy(() => import("../features/auth/SignupPage"));
const PerfilPage        = lazy(() => import("../features/auth/PerfilPage"));
const PacientesPage     = lazy(() => import("../features/pacientes/PacientesPage"));
const NuevoPacientePage = lazy(() => import("../features/pacientes/NuevoPacientePage"));
const FichaPacientePage = lazy(() => import("../features/pacientes/FichaPacientePage"));
const MisNotasPage      = lazy(() => import("../features/notas/MisNotasPage"));
const TodasNotasPage    = lazy(() => import("../features/notas/TodasNotasPage"));
const DetalleNotaPage   = lazy(() => import("../features/notas/DetalleNotaPage"));
const FormNotaPage      = lazy(() => import("../features/notas/FormNotaPage"));
const CatalogosPage     = lazy(() => import("../features/catalogos/CatalogosPage"));
const UsuariosPage      = lazy(() => import("../features/usuarios/UsuariosPage"));

// Fallback de suspense
const PageLoader = () => (
  <div
    role="status"
    aria-label="Cargando página"
    style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}
  >
    <span>Cargando…</span>
  </div>
);

// ---------------------------------------------------------------------------
// Componente interno que registra el interceptor 401
// ---------------------------------------------------------------------------

/**
 * Se monta una sola vez dentro del RouterProvider y registra el handler global
 * de 401. Necesita `useNavigate` que solo está disponible dentro del árbol del
 * router.
 *
 * Cuando el httpClient recibe un 401:
 * 1. Limpia el Store_Sesion (Requisito 5.1)
 * 2. Navega a /login con replace para no dejar historial (Requisito 5.2)
 *
 * Nota: si el usuario ya está en /login (401 de credenciales inválidas),
 * la redirección es idempotente y no causa bucle.
 */
function Interceptor401Registrar() {
  const navigate = useNavigate();
  const limpiar = useSessionStore((s) => s.limpiar);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      limpiar();
      navigate("/login", { replace: true });
    });
    // Solo registrar una vez al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// ---------------------------------------------------------------------------
// RutaRaiz — redirige a la pantalla inicial según el rol actual
// ---------------------------------------------------------------------------

function RutaRaiz() {
  const perfil = useSessionStore((s) => s.perfil);
  if (!perfil) return <Navigate to="/login" replace />;
  return <Navigate to={rutaInicialPorRol(perfil.rol)} replace />;
}

// ---------------------------------------------------------------------------
// Router principal
// ---------------------------------------------------------------------------

export function AppRouter() {
  return (
    <>
      <Interceptor401Registrar />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />
        {/* Ruta de confirmación de registro — Requisito 9.5, expuesta en puerto 4321 */}
        <Route path="/signup/:token" element={<SignupPage />} />

        {/* Rutas protegidas por autenticación */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <RutaRaiz />
            </RequireAuth>
          }
        />

        {/* Mis notas — solo médico */}
        <Route
          path="/mis-notas"
          element={
            <RequireAuth>
              <RequireRole roles={["medico"]}>
                <MisNotasPage />
              </RequireRole>
            </RequireAuth>
          }
        />

        {/* Todas las notas — secretaria y admin */}
        <Route
          path="/notas"
          element={
            <RequireAuth>
              <RequireRole roles={["secretaria", "admin"]}>
                <TodasNotasPage />
              </RequireRole>
            </RequireAuth>
          }
        />

        {/* Detalle de nota — todos los roles autenticados */}
        <Route
          path="/notas/:id"
          element={
            <RequireAuth>
              <DetalleNotaPage />
            </RequireAuth>
          }
        />

        {/* Formulario nueva nota — médico y admin */}
        <Route
          path="/notas/nuevo"
          element={
            <RequireAuth>
              <RequireRole roles={["medico", "admin"]}>
                <FormNotaPage />
              </RequireRole>
            </RequireAuth>
          }
        />

        {/* Formulario editar nota — médico y admin */}
        <Route
          path="/notas/:id/editar"
          element={
            <RequireAuth>
              <RequireRole roles={["medico", "admin"]}>
                <FormNotaPage />
              </RequireRole>
            </RequireAuth>
          }
        />

        {/* Pacientes — todos los roles */}
        <Route
          path="/pacientes"
          element={
            <RequireAuth>
              <PacientesPage />
            </RequireAuth>
          }
        />

        {/* Nuevo paciente */}
        <Route
          path="/pacientes/nuevo"
          element={
            <RequireAuth>
              <NuevoPacientePage />
            </RequireAuth>
          }
        />

        {/* Ficha de paciente — todos los roles */}
        <Route
          path="/pacientes/:id"
          element={
            <RequireAuth>
              <FichaPacientePage />
            </RequireAuth>
          }
        />

        {/* Catálogos — solo admin */}
        <Route
          path="/catalogos"
          element={
            <RequireAuth>
              <RequireRole roles={["admin"]}>
                <CatalogosPage />
              </RequireRole>
            </RequireAuth>
          }
        />

        {/* Usuarios — solo admin */}
        <Route
          path="/usuarios"
          element={
            <RequireAuth>
              <RequireRole roles={["admin"]}>
                <UsuariosPage />
              </RequireRole>
            </RequireAuth>
          }
        />

        {/* Perfil / cambio de contraseña — todos los roles */}
        <Route
          path="/perfil"
          element={
            <RequireAuth>
              <PerfilPage />
            </RequireAuth>
          }
        />

        {/* Catch-all: redirige a la pantalla inicial según rol */}
        <Route
          path="*"
          element={
            <RequireAuth>
              <RutaRaiz />
            </RequireAuth>
          }
        />
      </Routes>
      </Suspense>
    </>
  );
}
