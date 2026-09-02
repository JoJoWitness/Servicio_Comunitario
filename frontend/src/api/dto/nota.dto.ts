/**
 * DTO de Nota tal como lo entiende el backend — nombres con typos incluidos.
 *
 * Este archivo es la ÚNICA frontera donde existen los nombres incorrectos
 * del backend. El resto de la aplicación nunca debe ver estas claves.
 *
 * Tabla de mapeo completa (Requisitos 2.1–2.7):
 *
 * | Dominio (limpio)       | DTO backend               | Observación              |
 * |------------------------|---------------------------|--------------------------|
 * | anestesia              | anestia                   | typo del tag JSON        |
 * | idPaciente             | Id_paciente               | mayúscula inicial        |
 * | intervencionRealizada  | intervencion_realizado    | 'o' final en el DTO      |
 * | resumenIntervencion    | resumen_intervencion      |                          |
 * | comentarios            | comentarios               | van al final del resumen |
 * | medicoEncargado        | medico_encargado          | UUID                     |
 * | equipo (escritura)     | equipo (string[])         | excluye al encargado     |
 * | medicos (lectura)      | medicos (objeto[])        | equipo real para render  |
 *
 * Los campos `ojo` y `estado` están modelados en el dominio pero NO se serializan
 * mientras `BACKEND_SUPPORTS_OJO_ESTADO` sea false (Requisito 24.3).
 */

import type { Nota } from "../../domain/models";
import {
  formatRFC3339,
  horaFromRFC3339,
  horaToRFC3339,
  parseFechaISO,
  parseRFC3339,
} from "../../lib/datetime";
import { construirEquipo, derivarEquipoDesdeMedicos } from "../../lib/equipo";
import type { UsuarioDTO } from "./usuario.dto";
import { usuarioToDomain } from "./usuario.dto";

// ---------------------------------------------------------------------------
// Feature flag — Requisito 24.3
// ---------------------------------------------------------------------------

/**
 * Activar cuando el backend exponga los campos `ojo` y `estado` en el modelo
 * de nota. Mientras sea `false`, `notaToDto` no serializa esos campos.
 *
 * @backendDependency Requisito 24.3
 */
export const BACKEND_SUPPORTS_OJO_ESTADO = false;

// ---------------------------------------------------------------------------
// DTO — nombres exactos del backend (typos incluidos)
// ---------------------------------------------------------------------------

export interface NotaDTO {
  id?: number;
  dx_pre_operatorio: string;
  dx_post_operatorio: string;
  /** Typo del backend: debería ser `intervencion_realizada` */
  intervencion_realizado: string;
  resumen_intervencion: string;
  /** Comentarios del médico; se leen al final del resumen tras "Observaciones:" */
  comentarios?: string;
  fecha_comienzo: string;    // RFC3339
  fecha_culminacion: string; // RFC3339
  hora_comienzo: string;     // RFC3339 con fecha fija ignorada
  hora_culminacion: string;  // RFC3339 con fecha fija ignorada
  pabellon: string;
  es_electiva: boolean;
  es_emergencia: boolean;
  tuvo_biopsia: boolean;
  /** Typo del backend: debería ser `anestesia` */
  anestia: string;
  /** Typo del backend: mayúscula inicial */
  Id_paciente: string;
  medico_encargado?: string;
  /** Solo en escritura (POST/PUT): array de UUIDs excluyendo al encargado */
  equipo?: string[] | null;
  /** Solo en lectura (GET): objetos completos del equipo */
  medicos?: UsuarioDTO[] | null;

  // --- Solo lectura; los escribe el servidor (v0.4.0) ---
  /** Interruptor de legalización. Se cambia con PATCH /notas/{id}/legalizada. */
  legalizada?: boolean;
  legalizada_en?: string | null; // RFC3339
  legalizada_por?: string;
  created_at?: string;    // RFC3339
  editable_hasta?: string; // YYYY-MM-DD
  puede_editar?: boolean;
}

// ---------------------------------------------------------------------------
// Mapper: DTO → Dominio
// ---------------------------------------------------------------------------

/**
 * Convierte una `NotaDTO` del backend en un modelo de `Nota` de dominio limpio.
 * Corrige todos los typos y convierte fechas/horas a los tipos correctos.
 *
 * Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */
export function notaToDomain(dto: NotaDTO): Nota {
  const medicosRaw = dto.medicos ?? [];
  const medicos = medicosRaw.map(usuarioToDomain);

  return {
    id: dto.id,
    dxPreOperatorio: dto.dx_pre_operatorio,
    dxPostOperatorio: dto.dx_post_operatorio,
    intervencionRealizada: dto.intervencion_realizado,  // corrige typo
    resumenIntervencion: dto.resumen_intervencion,
    // Las notas registradas antes de que existiera la columna no lo traen.
    comentarios: dto.comentarios ?? "",
    fechaComienzo: parseRFC3339(dto.fecha_comienzo),
    fechaCulminacion: parseRFC3339(dto.fecha_culminacion),
    horaComienzo: horaFromRFC3339(dto.hora_comienzo),
    horaCulminacion: horaFromRFC3339(dto.hora_culminacion),
    pabellon: dto.pabellon,
    esElectiva: dto.es_electiva,
    esEmergencia: dto.es_emergencia,
    tuvoBiopsia: dto.tuvo_biopsia,
    anestesia: dto.anestia,                              // corrige typo
    idPaciente: dto.Id_paciente,                         // corrige mayúscula
    medicoEncargado: dto.medico_encargado,
    // Al leer, el equipo se deriva de los objetos medicos[].id
    equipo: derivarEquipoDesdeMedicos(medicos),
    medicos,

    // Un servidor anterior a v0.4.0 no manda estos campos. Se asume lo que
    // hacía la interfaz hasta entonces: nada legalizado y edición permitida,
    // con el 403 del servidor como red de seguridad.
    legalizada: dto.legalizada ?? false,
    legalizadaEn: dto.legalizada_en ? parseRFC3339(dto.legalizada_en) : undefined,
    legalizadaPor: dto.legalizada_por || undefined,
    createdAt: dto.created_at ? parseRFC3339(dto.created_at) : undefined,
    editableHasta: dto.editable_hasta ? parseFechaISO(dto.editable_hasta) : undefined,
    puedeEditar: dto.puede_editar ?? true,
  };
}

// ---------------------------------------------------------------------------
// Mapper: Dominio → DTO
// ---------------------------------------------------------------------------

/**
 * Convierte un modelo de `Nota` de dominio en `NotaDTO` para enviar al backend.
 *
 * @param nota - Modelo de dominio limpio
 * @param opts.medicoEncargadoId - UUID del médico encargado (necesario para
 *   excluirlo del campo `equipo` en el envío — Requisito 16.4)
 *
 * Requisitos: 2.1, 2.3, 2.4, 2.5, 2.6, 16.4, 24.3
 */
export function notaToDto(
  nota: Nota,
  opts: { medicoEncargadoId: string }
): NotaDTO {
  const dto: NotaDTO = {
    dx_pre_operatorio: nota.dxPreOperatorio,
    dx_post_operatorio: nota.dxPostOperatorio,
    intervencion_realizado: nota.intervencionRealizada, // reintroduce typo
    resumen_intervencion: nota.resumenIntervencion,
    comentarios: nota.comentarios ?? "",
    fecha_comienzo: formatRFC3339(nota.fechaComienzo),
    fecha_culminacion: formatRFC3339(nota.fechaCulminacion),
    hora_comienzo: horaToRFC3339(nota.horaComienzo),
    hora_culminacion: horaToRFC3339(nota.horaCulminacion),
    pabellon: nota.pabellon,
    es_electiva: nota.esElectiva,
    es_emergencia: nota.esEmergencia,
    tuvo_biopsia: nota.tuvoBiopsia,
    anestia: nota.anestesia,                            // reintroduce typo
    Id_paciente: nota.idPaciente,                       // reintroduce mayúscula
    medico_encargado: opts.medicoEncargadoId,
    // Excluye al encargado del equipo (Requisito 16.4)
    equipo: construirEquipo(nota.equipo, opts.medicoEncargadoId),
  };

  if (nota.id !== undefined) {
    dto.id = nota.id;
  }

  // Campos oftalmológicos pendientes de backend — Requisito 24.3
  // Se activan cuando BACKEND_SUPPORTS_OJO_ESTADO = true
  if (BACKEND_SUPPORTS_OJO_ESTADO) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dto as any).ojo = nota.ojo;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dto as any).estado = nota.estado;
  }

  return dto;
}
