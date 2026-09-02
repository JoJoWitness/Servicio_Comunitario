/**
 * Endpoints de biopsias (PRD 0.5.0).
 *
 * - GET    /biopsias[?estado=&medico=&paciente=&from=&to=&sin_resultado_desde=] → listarBiopsias
 * - GET    /biopsias/{id}                          → obtenerBiopsia
 * - POST   /biopsias                               → crearBiopsia (con nota_id o nota_client_uuid vincula de una)
 * - PUT    /biopsias/{id}                          → editarBiopsia
 * - DELETE /biopsias/{id}                          → eliminarBiopsia
 * - GET    /notas/{id}/biopsias                    → biopsiasDeNota
 * - POST   /notas/{id}/biopsias/{idBiopsia}        → vincularBiopsia
 * - DELETE /notas/{id}/biopsias/{idBiopsia}        → desvincularBiopsia
 * - GET    /pacientes/{id}/biopsias                → biopsiasDePaciente
 */

import type {
  Biopsia,
  FiltrosBiopsia,
  RolVinculoBiopsia,
} from "../../domain/models";
import { biopsiaToDomain, biopsiaToDto, type BiopsiaDTO } from "../dto/biopsia.dto";
import { request } from "../httpClient";
import type { PaginatedMeta, PaginationParams } from "../types";
import { conEspejo } from "@/offline/espejo";

export interface RespuestaBiopsias {
  data: Biopsia[];
  meta: PaginatedMeta;
  /** Sin resultado (tomadas + enviadas) con el mismo filtro de médico. */
  sinResultado: number;
  /** De esas, las que superan `diasAtraso` desde la toma. */
  atrasadas: number;
  diasAtraso: number;
}

interface RespuestaBiopsiasDTO {
  data: BiopsiaDTO[];
  meta: PaginatedMeta;
  sin_resultado?: number;
  atrasadas?: number;
  dias_atraso?: number;
}

function query(filtros?: FiltrosBiopsia, paginacion?: PaginationParams): string {
  const qs = new URLSearchParams();
  if (filtros?.estados?.length) qs.set("estado", filtros.estados.join(","));
  if (filtros?.medico) qs.set("medico", filtros.medico);
  if (filtros?.paciente) qs.set("paciente", filtros.paciente);
  if (filtros?.from) qs.set("from", filtros.from);
  if (filtros?.to) qs.set("to", filtros.to);
  if (filtros?.sinResultadoDesde) qs.set("sin_resultado_desde", filtros.sinResultadoDesde);
  if (paginacion?.page) qs.set("page", String(paginacion.page));
  if (paginacion?.size) qs.set("size", String(paginacion.size));
  if (paginacion?.sortBy) qs.set("sortBy", paginacion.sortBy);
  if (paginacion?.order) qs.set("order", paginacion.order);
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/**
 * Listado de seguimiento. La consulta "mis biopsias sin resultado" —solo el
 * médico y los estados por defecto— se refleja en el espejo para poder
 * consultar en quirófano sin señal; el resto va siempre a la red.
 */
export async function listarBiopsias(
  filtros?: FiltrosBiopsia,
  paginacion?: PaginationParams,
  opciones: { reflejar?: boolean } = {}
): Promise<RespuestaBiopsias> {
  const cargar = async () => {
    const raw = await request<RespuestaBiopsiasDTO>(`/biopsias${query(filtros, paginacion)}`);
    return {
      data: raw.data.map(biopsiaToDomain),
      meta: raw.meta,
      sinResultado: raw.sin_resultado ?? 0,
      atrasadas: raw.atrasadas ?? 0,
      diasAtraso: raw.dias_atraso ?? 30,
    };
  };
  return opciones.reflejar ? conEspejo("mis-biopsias", cargar) : cargar();
}

export async function obtenerBiopsia(id: number): Promise<Biopsia> {
  return biopsiaToDomain(await request<BiopsiaDTO>(`/biopsias/${id}`));
}

/**
 * Registra una biopsia. Con `notaId` o `notaClientUuid` el servidor la vincula
 * como origen en la misma llamada. `clientUuid` la hace idempotente.
 * Responde 409 si la nota de origen todavía no subió: el llamador encola.
 */
export async function crearBiopsia(
  biopsia: Biopsia,
  vinculo: { notaId?: number; notaClientUuid?: string; clientUuid?: string } = {}
): Promise<Biopsia> {
  const dto = await request<BiopsiaDTO>("/biopsias", {
    method: "POST",
    body: biopsiaToDto(biopsia, vinculo),
  });
  return biopsiaToDomain(dto);
}

export async function editarBiopsia(id: number, biopsia: Biopsia): Promise<Biopsia> {
  const dto = await request<BiopsiaDTO>(`/biopsias/${id}`, {
    method: "PUT",
    body: biopsiaToDto(biopsia),
  });
  return biopsiaToDomain(dto);
}

export async function eliminarBiopsia(id: number): Promise<void> {
  await request(`/biopsias/${id}`, { method: "DELETE" });
}

export async function biopsiasDeNota(notaId: number): Promise<Biopsia[]> {
  const dtos = await request<BiopsiaDTO[]>(`/notas/${notaId}/biopsias`);
  return (dtos ?? []).map(biopsiaToDomain);
}

export async function biopsiasDePaciente(pacienteId: string): Promise<Biopsia[]> {
  const dtos = await request<BiopsiaDTO[]>(`/pacientes/${pacienteId}/biopsias`);
  return (dtos ?? []).map(biopsiaToDomain);
}

export async function vincularBiopsia(
  notaId: number,
  biopsiaId: number,
  rol: RolVinculoBiopsia = "seguimiento"
): Promise<Biopsia> {
  const dto = await request<BiopsiaDTO>(`/notas/${notaId}/biopsias/${biopsiaId}`, {
    method: "POST",
    body: { rol },
  });
  return biopsiaToDomain(dto);
}

export async function desvincularBiopsia(notaId: number, biopsiaId: number): Promise<void> {
  await request(`/notas/${notaId}/biopsias/${biopsiaId}`, { method: "DELETE" });
}
