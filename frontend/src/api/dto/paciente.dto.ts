/**
 * DTO de Paciente tal como lo usa el backend.
 *
 * Los campos del DTO coinciden conceptualmente con el dominio, pero:
 * - Los campos de fecha se manejan como strings RFC3339 en el DTO.
 * - Los DTOs de escritura (POST/PUT) omiten el campo `id` (Requisitos 11.5, 13.2).
 */

import type { Genero, Paciente, TipoDocumento } from "../../domain/models";
import { formatRFC3339, parseRFC3339 } from "../../lib/datetime";
import { ESTUDIOS_IMAGENES, soloConocidos } from "../../domain/catalogosBiopsia";

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
  /** Antecedentes para la solicitud de biopsia (v0.5.0). */
  ocupacion?: string;
  raza?: string;
  antecedentes_oncologicos?: string;
  quimioterapia_ciclos?: number | null;
  radioterapia_ciclos?: number | null;
  estudios_imagenes?: string[] | null;
  hallazgo_estudios?: string;
  /** Solo lectura: si hay imagen de la cédula en el servidor (v0.4.0). */
  tiene_cedula?: boolean;
}

// ---------------------------------------------------------------------------
// DTO de escritura (POST /pacientes, PUT /pacientes/{id})
// Sin campo `id` — Requisitos 11.5, 13.2
// ---------------------------------------------------------------------------

export type PacienteWriteDTO = Omit<PacienteDTO, "id" | "tiene_cedula">;

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
    ocupacion: dto.ocupacion || undefined,
    raza: dto.raza || undefined,
    antecedentesOncologicos: dto.antecedentes_oncologicos || undefined,
    quimioterapiaCiclos: dto.quimioterapia_ciclos ?? undefined,
    radioterapiaCiclos: dto.radioterapia_ciclos ?? undefined,
    estudiosImagenes: soloConocidos(ESTUDIOS_IMAGENES, dto.estudios_imagenes),
    hallazgoEstudios: dto.hallazgo_estudios || undefined,
    tieneCedula: dto.tiene_cedula ?? false,
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
    ocupacion: paciente.ocupacion ?? "",
    raza: paciente.raza ?? "",
    antecedentes_oncologicos: paciente.antecedentesOncologicos ?? "",
    quimioterapia_ciclos: paciente.quimioterapiaCiclos ?? null,
    radioterapia_ciclos: paciente.radioterapiaCiclos ?? null,
    estudios_imagenes: paciente.estudiosImagenes ?? [],
    hallazgo_estudios: paciente.hallazgoEstudios ?? "",
  };
}
