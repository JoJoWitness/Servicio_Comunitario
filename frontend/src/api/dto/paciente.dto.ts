/**
 * DTO de Paciente tal como lo usa el backend.
 *
 * Los campos del DTO coinciden conceptualmente con el dominio, pero:
 * - Los campos de fecha se manejan como strings RFC3339 en el DTO.
 * - Los DTOs de escritura (POST/PUT) omiten el campo `id` (Requisitos 11.5, 13.2).
 */

import type { Genero, Paciente, TipoDocumento } from "../../domain/models";
import { formatRFC3339, parseRFC3339 } from "../../lib/datetime";

// ---------------------------------------------------------------------------
// DTO de lectura (GET /pacientes, GET /pacientes/{id})
// ---------------------------------------------------------------------------

export interface PacienteDTO {
  id: string;
  historia_medica: string;
  tipo_documento: TipoDocumento;
  numero_identificacion: string;
  nombre: string;
  genero: Genero;
  fecha_nacimiento: string; // RFC3339
  telefono?: string;
  direccion?: string;
  eliminado: boolean;
}

// ---------------------------------------------------------------------------
// DTO de escritura (POST /pacientes, PUT /pacientes/{id})
// Sin campo `id` — Requisitos 11.5, 13.2
// ---------------------------------------------------------------------------

export type PacienteWriteDTO = Omit<PacienteDTO, "id">;

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

/** DTO → Dominio */
export function pacienteToDomain(dto: PacienteDTO): Paciente {
  return {
    id: dto.id,
    historiaMedica: dto.historia_medica,
    tipoDocumento: dto.tipo_documento,
    numeroIdentificacion: dto.numero_identificacion,
    nombre: dto.nombre,
    genero: dto.genero,
    fechaNacimiento: parseRFC3339(dto.fecha_nacimiento),
    telefono: dto.telefono,
    direccion: dto.direccion,
    eliminado: dto.eliminado,
  };
}

/**
 * Dominio → DTO de escritura (sin `id`).
 * Usado tanto en POST como en PUT — Requisitos 11.5, 13.2.
 */
export function pacienteToWriteDto(paciente: Paciente): PacienteWriteDTO {
  return {
    historia_medica: paciente.historiaMedica,
    tipo_documento: paciente.tipoDocumento,
    numero_identificacion: paciente.numeroIdentificacion,
    nombre: paciente.nombre,
    genero: paciente.genero,
    fecha_nacimiento: formatRFC3339(paciente.fechaNacimiento),
    telefono: paciente.telefono,
    direccion: paciente.direccion,
    eliminado: paciente.eliminado,
  };
}
