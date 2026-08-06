/**
 * DTOs de los catálogos clínicos: Diagnostico, Procedimiento y Tecnica.
 * Los campos del backend coinciden con el dominio, por lo que los mappers
 * son directos pero se mantienen para consistencia de la capa.
 */

import type {
  Diagnostico,
  Procedimiento,
  Tecnica,
} from "../../domain/models";

// ---------------------------------------------------------------------------
// Diagnóstico
// ---------------------------------------------------------------------------

export interface DiagnosticoDTO {
  id: number;
  diagnostico: string;
  resumen?: string;
}

export function diagnosticoToDomain(dto: DiagnosticoDTO): Diagnostico {
  return { id: dto.id, diagnostico: dto.diagnostico, resumen: dto.resumen };
}

export function diagnosticoToDto(
  d: Omit<Diagnostico, "id"> & { id?: number }
): DiagnosticoDTO {
  return { id: d.id ?? 0, diagnostico: d.diagnostico, resumen: d.resumen };
}

// ---------------------------------------------------------------------------
// Procedimiento
// ---------------------------------------------------------------------------

export interface ProcedimientoDTO {
  id: number;
  intervencion: string;
  resumen?: string;
}

export function procedimientoToDomain(dto: ProcedimientoDTO): Procedimiento {
  return {
    id: dto.id,
    intervencion: dto.intervencion,
    resumen: dto.resumen,
  };
}

export function procedimientoToDto(
  p: Omit<Procedimiento, "id"> & { id?: number }
): ProcedimientoDTO {
  return { id: p.id ?? 0, intervencion: p.intervencion, resumen: p.resumen };
}

// ---------------------------------------------------------------------------
// Técnica
// ---------------------------------------------------------------------------

export interface TecnicaDTO {
  id: number;
  tecnica: string;
  frase?: string;
  huecos?: unknown[];
}

export function tecnicaToDomain(dto: TecnicaDTO): Tecnica {
  return {
    id: dto.id,
    tecnica: dto.tecnica,
    frase: dto.frase,
    huecos: dto.huecos,
  };
}

export function tecnicaToDto(
  t: Omit<Tecnica, "id"> & { id?: number }
): TecnicaDTO {
  return {
    id: t.id ?? 0,
    tecnica: t.tecnica,
    frase: t.frase,
    huecos: t.huecos,
  };
}
