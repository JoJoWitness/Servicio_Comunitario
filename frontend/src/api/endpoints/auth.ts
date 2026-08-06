/**
 * Endpoints de autenticación.
 *
 * Rutas cubiertas:
 * - POST /auth/login                    → login
 * - GET  /auth/validateUser             → validateUser
 * - POST /auth/logout                   → logout
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

export interface LoginInput {
  correo: string;
  contrasena: string;
}

export interface InvitacionInput {
  correo: string;
  nombres: string;
  apellidos: string;
  rol: string;
  contrasena: string;
}

/**
 * Inicia sesión con correo y contraseña.
 * POST /auth/login — Requisito 3.2
 */
export async function login(input: LoginInput): Promise<Usuario> {
  const raw = await request<unknown>("/auth/login", {
    method: "POST",
    body: { correo: input.correo, contrasena: input.contrasena },
  });
  const dto = Array.isArray(raw) ? (raw[0] as UsuarioDTO) : (raw as UsuarioDTO);
  return usuarioToDomain(dto);
}

/**
 * Confirma que la sesión (cookie HttpOnly) sigue activa.
 * GET /auth/validateUser — Requisito 4.1
 *
 * El backend devuelve 200 sin body si la sesión es válida, 401 si expiró.
 * El perfil viene del localStorage (zustand/persist), no de esta respuesta.
 */
export async function validateUser(): Promise<void> {
  await request<unknown>("/auth/validateUser");
}

/**
 * Cierra la sesión del usuario actual.
 * POST /auth/logout — Requisito 6.1
 */
export async function logout(): Promise<void> {
  await request("/auth/logout", { method: "POST" });
}

/**
 * Invita a un usuario nuevo (solo admin).
 * POST /auth/signup/confirmation — Requisito 9.1
 */
export async function confirmarInvitacion(data: InvitacionInput): Promise<void> {
  await request("/auth/signup/confirmation", { method: "POST", body: data });
}

/**
 * Completa el registro del usuario invitado usando el token del enlace de correo.
 * POST /auth/signup/{token} — Requisito 9.2
 */
export async function confirmarRegistro(token: string): Promise<Usuario> {
  const dto = await request<UsuarioDTO>(`/auth/signup/${token}`, { method: "POST" });
  return usuarioToDomain(dto);
}

/**
 * Cambia la contraseña del usuario actual.
 * PUT /usuarios/me/password — Requisito 8.2
 */
export async function cambiarPassword(actual: string, nueva: string): Promise<void> {
  await request("/usuarios/me/password", {
    method: "PUT",
    body: { contrasena_actual: actual, contrasena_nueva: nueva },
  });
}
