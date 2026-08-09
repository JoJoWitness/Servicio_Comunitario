/**
 * Endpoints de Notas Operatorias.
 *
 * Rutas cubiertas:
 * - POST   /notas                           → crearNota
 * - PUT    /notas/{id}                      → editarNota
 * - DELETE /notas/{id}                      → eliminarNota
 * - GET    /notas/{id}                      → obtenerNota
 * - GET    /notas/medics                    → misNotas (sin filtro)
 * - GET    /notas/medics/dates?from=&to=    → misNotas (con rango)
 * - GET    /notas[?medico=&paciente=&from=&to=] → todasLasNotas
 * - GET    /notas/pacientes/{id}            → notasDePaciente (sin filtro)
 * - GET    /notas/pacientes/dates?id=&from=&to= → notasDePaciente (con rango)
 * - GET    /notas/medics/export?from=&to=   → exportarRecordQuirurgico (.xlsx)
 *
 * Requisitos: 12.2, 12.5, 14.6, 18.1, 18.4, 19.1, 19.2, 20.1, 21.2, 23.2
 */

import type { FiltrosNota, Nota, RangoFechas } from "../../domain/models";
import type { NotaDTO } from "../dto/nota.dto";
import { notaToDomain, notaToDto } from "../dto/nota.dto";
import { request, requestBlob } from "../httpClient";
import { parseFilename } from "../../lib/contentDisposition";
import { conEspejo } from "@/offline/espejo";
import type { PaginatedResponse, PaginationParams } from "../types";
import { buildPaginationQuery } from "./queryUtils";

// ---------------------------------------------------------------------------
// Helpers de construcción de query string
// ---------------------------------------------------------------------------

/**
 * Construye un query string incluyendo SOLO los parámetros presentes (no nulos/vacíos).
 * Requisito 19.2: la query incluye exactamente los filtros activos.
 */
function buildQuery(
  params: Record<string, string | undefined>
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      qs.append(key, value);
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/**
 * Crea una nota operatoria nueva.
 * POST /notas
 *
 * Requisito 14.6
 * Posibles errores: 400 → Requisito 14.8
 */
export async function crearNota(
  nota: Nota,
  medicoEncargadoId: string,
  clientUuid?: string
): Promise<Nota> {
  const dto = await request<NotaDTO>("/notas", {
    method: "POST",
    // El `client_uuid` viaja también en el alta normal, no solo al sincronizar.
    // Cuesta nada y cubre el caso feo: la nota se guarda en el servidor pero la
    // respuesta se pierde, el médico ve un error y vuelve a darle a guardar. Sin
    // esta llave, esa cirugía quedaría dos veces en la historia clínica.
    body: { ...notaToDto(nota, { medicoEncargadoId }), client_uuid: clientUuid },
  });
  return notaToDomain(dto);
}

/**
 * Actualiza una nota existente.
 * PUT /notas/{id}
 *
 * Requisito 21.2
 * Posibles errores 403: clasificar con `clasificar403Nota` → Requisito 21.4
 */
export async function editarNota(
  id: number,
  nota: Nota,
  medicoEncargadoId: string
): Promise<Nota> {
  const dto = await request<NotaDTO>(`/notas/${id}`, {
    method: "PUT",
    body: notaToDto(nota, { medicoEncargadoId }),
  });
  return notaToDomain(dto);
}

/**
 * Elimina una nota.
 * DELETE /notas/{id}
 *
 * Requisito 23.2
 * Posibles errores 403: clasificar con `clasificar403Nota` → Requisito 23.4
 */
export async function eliminarNota(id: number): Promise<void> {
  await request(`/notas/${id}`, { method: "DELETE" });
}

/**
 * Obtiene el detalle de una nota.
 * GET /notas/{id}
 *
 * Requisito 20.1
 * Posible error 404 → Requisito 20.4
 */
export async function obtenerNota(id: number): Promise<Nota> {
  const dto = await request<NotaDTO>(`/notas/${id}`);
  return notaToDomain(dto);
}

/**
 * Obtiene las notas del médico de la sesión actual.
 * - Sin rango: GET /notas/medics
 * - Con rango: GET /notas/medics/dates?from=&to=
 *
 * Requisitos 18.1, 18.4
 */
export async function misNotas(rango?: RangoFechas): Promise<Nota[]> {
  const cargar = async () => {
    let path: string;
    if (rango?.from || rango?.to) {
      path = `/notas/medics/dates${buildQuery({ from: rango.from, to: rango.to })}`;
    } else {
      path = "/notas/medics";
    }
    const dtos = await request<NotaDTO[]>(path);
    return dtos.map(notaToDomain);
  };

  // Sin rango es el historial completo del médico: lo que se refleja para que
  // pueda consultar sus operaciones anteriores en un quirófano sin señal.
  // Con rango es una consulta puntual y se deja pasar a la red.
  if (!rango?.from && !rango?.to) {
    return conEspejo("mis-notas", cargar);
  }
  return cargar();
}

/**
 * Obtiene todas las notas del servicio con filtros opcionales y paginación.
 * GET /notas[?medico=&paciente=&from=&to=&page=&size=&sortBy=&order=]
 *
 * Solo incluye en la query los filtros que estén presentes — Requisito 19.2.
 * Requisito 19.1
 */
export async function todasLasNotas(
  filtros?: FiltrosNota,
  paginacion?: PaginationParams
): Promise<PaginatedResponse<Nota>> {
  const filterQs = new URLSearchParams();
  if (filtros?.medico)   filterQs.set("medico",   filtros.medico);
  if (filtros?.paciente) filterQs.set("paciente", filtros.paciente);
  if (filtros?.from)     filterQs.set("from",     filtros.from);
  if (filtros?.to)       filterQs.set("to",       filtros.to);
  if (paginacion?.page)   filterQs.set("page",   String(paginacion.page));
  if (paginacion?.size)   filterQs.set("size",   String(paginacion.size));
  if (paginacion?.sortBy) filterQs.set("sortBy", paginacion.sortBy);
  if (paginacion?.order)  filterQs.set("order",  paginacion.order);
  const qs = filterQs.toString();
  const path = `/notas${qs ? `?${qs}` : ""}`;

  const raw = await request<PaginatedResponse<NotaDTO>>(path);
  return {
    data: raw.data.map(notaToDomain),
    meta: raw.meta,
  };
}

/**
 * Obtiene el historial de notas de un paciente.
 * - Sin rango: GET /notas/pacientes/{id}
 * - Con rango: GET /notas/pacientes/dates?id={id}&from=&to=
 *
 * Requisitos 12.2, 12.5
 */
export async function notasDePaciente(
  pacienteId: string,
  rango?: RangoFechas
): Promise<Nota[]> {
  let path: string;
  if (rango?.from || rango?.to) {
    path = `/notas/pacientes/dates${buildQuery({
      id: pacienteId,
      from: rango.from,
      to: rango.to,
    })}`;
  } else {
    path = `/notas/pacientes/${pacienteId}`;
  }
  const dtos = await request<NotaDTO[]>(path);
  return dtos.map(notaToDomain);
}

// ---------------------------------------------------------------------------
// Exportación a Excel
// ---------------------------------------------------------------------------

/**
 * Descarga el record quirúrgico del médico de la sesión en .xlsx.
 * GET /notas/medics/export?from=&to=
 *
 * El rango es opcional en ambos extremos: sin parámetros baja el historial
 * completo. El backend resuelve el nombre del archivo y lo manda en
 * `Content-Disposition`.
 */
export async function exportarRecordQuirurgico(
  rango?: RangoFechas
): Promise<{ blob: Blob; nombreArchivo: string }> {
  const path = `/notas/medics/export${buildQuery({
    from: rango?.from,
    to: rango?.to,
  })}`;

  const { blob, contentDisposition } = await requestBlob(path);
  return { blob, nombreArchivo: parseFilename(contentDisposition) };
}
