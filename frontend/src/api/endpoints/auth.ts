/**
 * Endpoints de autenticación.
 *
 * Rutas cubiertas:
 * - POST /auth/login                    → login
 * - GET  /auth/validateUser             → validateUser
 * - POST /auth/logout                   → logout  (el backend no especifica método; se usa POST)
 * - POST /auth/signup/confirmation      → confirmarInvitacion
 * - POST /auth/signup/{token}           → confirmarRegistro
 * - PUT  /usuarios/me/password          → cambiarPassword
 *
 * Requisitos: 3.2, 4.1, 6.1, 8.2, 9.1, 9.2
 */

import type { Usuario } from "../../domain/models";
import type { UsuarioDTO } from "../dto/usuario.dto";
import { usuarioToDomain } from "../dto/usuario.dto";
import { request } from "../httpClient";

// ---------------------------------------------------------------------------
// Tipos de entrada
// ---------------------------------------------------------------------------

export interface LoginInput {
  correo: string;
  contrasena: string;
}

/** Datos para invitar un usuario nuevo (admin) — Requisito 9.1 */
export interface InvitacionInput {
  correo: string;
  nombres: string;
  apellidos: string;
  rol: string;
  contrasena: string;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/**
 * Inicia sesión con correo y contraseña.
 * POST /auth/login
 *
 * En éxito (200): devuelve el perfil del usuario.
 * En 401: el httpClient lanza ApiError — el componente de login lo captura
 * y muestra "credenciales inválidas" sin redirigir (Requisito 3.5).
 *
 * NOTA: El interceptor_401 disparará la notificación, pero como el componente
 * de login captura el error antes de que React Router procese la redirección,
 * el flujo de UI permanece en la pantalla de login. El handler registrado
 * desde el router debe ser idempotente si el usuario ya está en /login.
 */
export async function login(input: LoginInput): Promise<Usuario> {
  const dto = await request<UsuarioDTO>("/auth/login", {
    method: "POST",
    body: { correo: input.correo, contrasena: input.contrasena },
  });
  return usuarioToDomain(dto);
}

/**
 * Valida la sesión existente (cookie HttpOnly).
 * GET /auth/validateUser
 *
 * Requisito 4.1: se llama al iniciar la app para rehidratar la sesión.
 */
export async function validateUser(): Promise<Usuario> {
  const dto = await request<UsuarioDTO>("/auth/validateUser");
  return usuarioToDomain(dto);
}

/**
 * Cierra la sesión del usuario actual.
 * POST /auth/logout
 *
 * Requisito 6.1
 */
export async function logout(): Promise<void> {
  await request("/auth/logout", { method: "POST" });
}

/**
 * Invita a un usuario nuevo (solo admin).
 * POST /auth/signup/confirmation
 *
 * Requisito 9.1
 */
export async function confirmarInvitacion(
  data: InvitacionInput
): Promise<void> {
  await request("/auth/signup/confirmation", {
    method: "POST",
    body: data,
  });
}

/**
 * Completa el registro del usuario invitado usando el token del enlace de correo.
 * POST /auth/signup/{token}
 *
 * Devuelve el perfil del usuario recién registrado para iniciar sesión directamente.
 * Requisito 9.2
 */
export async function confirmarRegistro(token: string): Promise<Usuario> {
  const dto = await request<UsuarioDTO>(`/auth/signup/${token}`, {
    method: "POST",
  });
  return usuarioToDomain(dto);
}

/**
 * Cambia la contraseña del usuario actual.
 * PUT /usuarios/me/password
 *
 * La validación en cliente (mín. 8 chars, nueva ≠ actual) ocurre antes de llamar
 * a este endpoint — ver `domain/validation/password.validation.ts`.
 *
 * En 403: contraseña actual incorrecta (Requisito 8.6)
 * En 400: validación del backend    (Requisito 8.7)
 *
 * Requisito 8.2
 */
export async function cambiarPassword(
  actual: string,
  nueva: string
): Promise<void> {
  await request("/usuarios/me/password", {
    method: "PUT",
    body: { contrasena_actual: actual, contrasena_nueva: nueva },
  });
}
