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
import { request } from "../httpClient";

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/**
 * Obtiene todos los pacientes del sistema.
 * GET /pacientes
 *
 * El filtrado local (búsqueda por nombre/cédula/historia) se realiza en cliente
 * usando `lib/search.ts`. Requisito 10.1
 */
export async function listarPacientes(): Promise<Paciente[]> {
  const dtos = await request<PacienteDTO[]>("/pacientes");
  return dtos.map(pacienteToDomain);
}

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
