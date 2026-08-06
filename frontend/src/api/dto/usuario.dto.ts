/**
 * DTO de Usuario tal como lo devuelve el backend.
 * Los campos coinciden con el dominio (sin typos), por lo que el mapper
 * es directo, pero se mantiene el archivo para consistencia de la capa.
 */

import type { Rol, Usuario } from "../../domain/models";

// ---------------------------------------------------------------------------
// DTO
// ---------------------------------------------------------------------------

export interface UsuarioDTO {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: Rol;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

/** DTO → Dominio */
export function usuarioToDomain(dto: UsuarioDTO): Usuario {
  return {
    id: dto.id,
    nombres: dto.nombres,
    apellidos: dto.apellidos,
    correo: dto.correo,
    rol: dto.rol,
  };
}

/** Dominio → DTO (para POST/PUT /usuarios) */
export function usuarioToDto(usuario: Omit<Usuario, "id"> & { id?: string }): UsuarioDTO {
  return {
    id: usuario.id ?? "",
    nombres: usuario.nombres,
    apellidos: usuario.apellidos,
    correo: usuario.correo,
    rol: usuario.rol,
  };
}
