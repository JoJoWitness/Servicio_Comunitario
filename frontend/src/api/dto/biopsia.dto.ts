/**
 * DTO de Biopsia tal como lo entiende el backend (PRD 0.5.0).
 *
 * Las fechas del ciclo son DATE en la base; viajan como RFC3339 a medianoche
 * UTC, igual que `fecha_comienzo` de la nota, y `formatFechaUI` las lee así.
 */

import type {
  Biopsia,
  EstadoBiopsia,
  NotaVinculada,
  Ojo,
  RolVinculoBiopsia,
} from "../../domain/models";
import { formatRFC3339, parseRFC3339 } from "../../lib/datetime";
import type { UsuarioDTO } from "./usuario.dto";
import { usuarioToDomain } from "./usuario.dto";

export interface NotaVinculadaDTO {
  id_nota_operatoria: number;
  rol: RolVinculoBiopsia;
  fecha_comienzo: string;
  intervencion_realizada: string;
  vinculada_en: string;
}

export interface BiopsiaDTO {
  id?: number;
  client_uuid?: string;
  id_paciente: string;
  paciente_nombre?: string;
  id_medico_responsable: string;
  medico_responsable?: UsuarioDTO | null;
  ojo?: Ojo | "";
  tejido: string;
  descripcion_macroscopica: string;
  diagnostico_presuntivo: string;
  fecha_toma: string;
  laboratorio?: string;
  fecha_envio?: string | null;
  numero_patologia?: string;
  resultado?: string;
  fecha_resultado?: string | null;
  fecha_entrega?: string | null;
  estado: EstadoBiopsia;
  observaciones: string;
  eliminado?: boolean;
  created_at?: string;
  updated_at?: string;
  notas?: NotaVinculadaDTO[] | null;
  puede_editar?: boolean;
  puede_tramitar?: boolean;
  /** Solo escritura: crear y vincular como origen en una sola llamada. */
  nota_id?: number;
  nota_client_uuid?: string;
}

function fechaOpcional(valor?: string | null): Date | undefined {
  return valor ? parseRFC3339(valor) : undefined;
}

function aRFC3339Opcional(fecha?: Date): string | null {
  return fecha ? formatRFC3339(fecha) : null;
}

function notaVinculadaToDomain(dto: NotaVinculadaDTO): NotaVinculada {
  return {
    idNota: dto.id_nota_operatoria,
    rol: dto.rol,
    fechaComienzo: parseRFC3339(dto.fecha_comienzo),
    intervencion: dto.intervencion_realizada,
    vinculadaEn: parseRFC3339(dto.vinculada_en),
  };
}

export function biopsiaToDomain(dto: BiopsiaDTO): Biopsia {
  return {
    id: dto.id,
    clientUuid: dto.client_uuid || undefined,
    idPaciente: dto.id_paciente,
    pacienteNombre: dto.paciente_nombre,
    idMedicoResponsable: dto.id_medico_responsable,
    medicoResponsable: dto.medico_responsable
      ? usuarioToDomain(dto.medico_responsable)
      : undefined,
    ojo: dto.ojo ? dto.ojo : undefined,
    tejido: dto.tejido,
    descripcionMacroscopica: dto.descripcion_macroscopica ?? "",
    diagnosticoPresuntivo: dto.diagnostico_presuntivo ?? "",
    fechaToma: parseRFC3339(dto.fecha_toma),
    laboratorio: dto.laboratorio || undefined,
    fechaEnvio: fechaOpcional(dto.fecha_envio),
    numeroPatologia: dto.numero_patologia || undefined,
    resultado: dto.resultado || undefined,
    fechaResultado: fechaOpcional(dto.fecha_resultado),
    fechaEntrega: fechaOpcional(dto.fecha_entrega),
    estado: dto.estado,
    observaciones: dto.observaciones ?? "",
    createdAt: fechaOpcional(dto.created_at),
    updatedAt: fechaOpcional(dto.updated_at),
    notas: (dto.notas ?? []).map(notaVinculadaToDomain),
    puedeEditar: dto.puede_editar ?? false,
    puedeTramitar: dto.puede_tramitar ?? false,
  };
}

export function biopsiaToDto(
  b: Biopsia,
  vinculo: { notaId?: number; notaClientUuid?: string; clientUuid?: string } = {}
): BiopsiaDTO {
  const dto: BiopsiaDTO = {
    id_paciente: b.idPaciente,
    id_medico_responsable: b.idMedicoResponsable,
    ojo: b.ojo ?? "",
    tejido: b.tejido,
    descripcion_macroscopica: b.descripcionMacroscopica ?? "",
    diagnostico_presuntivo: b.diagnosticoPresuntivo ?? "",
    fecha_toma: formatRFC3339(b.fechaToma),
    laboratorio: b.laboratorio ?? "",
    fecha_envio: aRFC3339Opcional(b.fechaEnvio),
    numero_patologia: b.numeroPatologia ?? "",
    resultado: b.resultado ?? "",
    fecha_resultado: aRFC3339Opcional(b.fechaResultado),
    fecha_entrega: aRFC3339Opcional(b.fechaEntrega),
    estado: b.estado,
    observaciones: b.observaciones ?? "",
  };
  if (b.id !== undefined) dto.id = b.id;
  if (vinculo.clientUuid) dto.client_uuid = vinculo.clientUuid;
  if (vinculo.notaId) dto.nota_id = vinculo.notaId;
  if (vinculo.notaClientUuid) dto.nota_client_uuid = vinculo.notaClientUuid;
  return dto;
}
