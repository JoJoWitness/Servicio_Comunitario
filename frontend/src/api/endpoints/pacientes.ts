/**
 * Endpoints de Pacientes.
 *
 * Rutas cubiertas:
 * - GET    /pacientes        → listarPacientes
 * - GET    /pacientes/{id}   → obtenerPaciente
 * - POST   /pacientes        → crearPaciente      (sin campo `id` — Req 11.5)
 * - PUT    /pacientes/{id}   → editarPaciente      (sin campo `id` — Req 13.2)
 * - DELETE /pacientes/{id}   → darDeBajaPaciente   (solo admin — Req 13.3)
 *
 * Requisitos: 10.1, 11.5, 12.1, 13.2, 13.3
 */

import type { Paciente } from "../../domain/models";
import type { PacienteDTO } from "../dto/paciente.dto";
import {
  pacienteToDomain,
  pacienteToWriteDto,
} from "../dto/paciente.dto";
import { isRedError } from "../errors";
import { request } from "../httpClient";
import type { FiltrosPacientesParams, PaginatedResponse, PaginationParams } from "../types";
import { buildFilterQuery, coincide, paginarEnLocal, TAMANO_PAGINA_MAX } from "./queryUtils";
import { listaReflejada, reflejar } from "@/offline/espejo";

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/**
 * Obtiene todos los pacientes del sistema (paginado server-side).
 * GET /pacientes[?nombre=&documento=&historia_medica=&genero=&page=&size=&sortBy=&order=]
 *
 * Requisito 10.1
 */
export async function listarPacientes(
  filtros?: FiltrosPacientesParams,
  params?: PaginationParams
): Promise<PaginatedResponse<Paciente>> {
  try {
    return await pedirPacientes(filtros, params);
  } catch (error) {
    // Sin red: espejo, filtrando y paginando aquí mismo.
    if (!isRedError(error)) throw error;

    const espejo = await listaReflejada<Paciente>("pacientes");
    if (!espejo) throw error;
    return paginarEnLocal(filtrarPacientes(espejo, filtros), params);
  }
}

async function pedirPacientes(
  filtros?: FiltrosPacientesParams,
  params?: PaginationParams
): Promise<PaginatedResponse<Paciente>> {
  const qs = buildFilterQuery(filtros as Record<string, string | undefined>, params);
  const raw = await request<PaginatedResponse<PacienteDTO>>(`/pacientes${qs}`);
  return {
    data: raw.data.map(pacienteToDomain),
    meta: raw.meta,
  };
}

function filtrarPacientes(
  pacientes: Paciente[],
  filtros?: FiltrosPacientesParams
): Paciente[] {
  if (!filtros) return pacientes;

  return pacientes.filter((p) => {
    if (filtros.nombre && !coincide(p.nombre, filtros.nombre)) return false;
    if (filtros.documento && !coincide(p.numeroIdentificacion, filtros.documento)) return false;
    if (filtros.historia_medica && !coincide(p.historiaMedica, filtros.historia_medica)) return false;
    if (filtros.genero && p.genero !== filtros.genero) return false;
    return true;
  });
}

/**
 * El padrón completo, página a página. Llena el selector de paciente y es el
 * único que escribe el espejo.
 */
export async function todosLosPacientes(): Promise<Paciente[]> {
  try {
    const acumulado: Paciente[] = [];
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const respuesta = await pedirPacientes(undefined, {
        page: pagina,
        size: TAMANO_PAGINA_MAX,
      });
      acumulado.push(...respuesta.data);
      totalPaginas = respuesta.meta?.totalPages ?? 1;
      pagina++;
    } while (pagina <= totalPaginas && pagina <= LIMITE_PAGINAS);

    await reflejar("pacientes", acumulado);
    return acumulado;
  } catch (error) {
    if (!isRedError(error)) throw error;

    const espejo = await listaReflejada<Paciente>("pacientes");
    if (!espejo) throw error;
    return espejo;
  }
}

/** Tope: 3000 pacientes. */
const LIMITE_PAGINAS = 30;

/**
 * Obtiene un paciente por su id.
 * GET /pacientes/{id}
 *
 * ATENCIÓN: el backend responde 500 si el paciente no existe (en lugar de 404).
 * El componente consumidor debe capturar `ApiError` con status 500 y mostrar
 * "paciente no encontrado" (Requisito 12.6).
 *
 * Requisito 12.1
 */
export async function obtenerPaciente(id: string): Promise<Paciente> {
  const dto = await request<PacienteDTO>(`/pacientes/${id}`);
  return pacienteToDomain(dto);
}

/**
 * Registra un paciente nuevo.
 * POST /pacientes (sin campo `id` en el body)
 *
 * Posibles errores del backend:
 * - 400: historia médica duplicada          → Requisito 11.6
 * - 500: número de identificación duplicado → Requisito 11.7
 *
 * Requisito 11.5
 */
export async function crearPaciente(paciente: Paciente): Promise<Paciente> {
  const writeDto = pacienteToWriteDto(paciente);
  const dto = await request<PacienteDTO>("/pacientes", {
    method: "POST",
    body: writeDto,
  });
  return pacienteToDomain(dto);
}

/**
 * Actualiza los datos de un paciente existente.
 * PUT /pacientes/{id} (sin campo `id` en el body)
 *
 * Requisito 13.2
 */
export async function editarPaciente(
  id: string,
  paciente: Paciente
): Promise<Paciente> {
  const writeDto = pacienteToWriteDto(paciente);
  const dto = await request<PacienteDTO>(`/pacientes/${id}`, {
    method: "PUT",
    body: writeDto,
  });
  return pacienteToDomain(dto);
}

/**
 * Da de baja lógica a un paciente (solo admin).
 * DELETE /pacientes/{id}
 *
 * Requisito 13.3
 */
export async function darDeBajaPaciente(id: string): Promise<void> {
  await request(`/pacientes/${id}`, { method: "DELETE" });
}
