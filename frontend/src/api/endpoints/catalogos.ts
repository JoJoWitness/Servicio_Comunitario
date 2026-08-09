/**
 * Endpoints de Catálogos Clínicos (Diagnósticos, Procedimientos, Técnicas).
 *
 * Rutas cubiertas:
 * - GET    /diagnosticos          → listarDiagnosticos
 * - POST   /diagnosticos          → crearDiagnostico
 * - PUT    /diagnosticos/{id}     → editarDiagnostico
 * - DELETE /diagnosticos/{id}     → eliminarDiagnostico
 *
 * - GET    /procedimientos        → listarProcedimientos
 * - POST   /procedimientos        → crearProcedimiento
 * - PUT    /procedimientos/{id}   → editarProcedimiento
 * - DELETE /procedimientos/{id}   → eliminarProcedimiento
 *
 * - GET    /tecnicas              → listarTecnicas
 * - POST   /tecnicas              → crearTecnica
 * - PUT    /tecnicas/{id}         → editarTecnica
 * - DELETE /tecnicas/{id}         → eliminarTecnica
 *
 * Requisitos: 17.1, 27.2, 27.3, 27.4, 27.5
 */

import type { Diagnostico, Procedimiento, Tecnica } from "../../domain/models";
import type { DiagnosticoDTO, ProcedimientoDTO, TecnicaDTO } from "../dto/catalogo.dto";
import {
  diagnosticoToDomain,
  diagnosticoToDto,
  procedimientoToDomain,
  procedimientoToDto,
  tecnicaToDomain,
  tecnicaToDto,
} from "../dto/catalogo.dto";
import { request } from "../httpClient";
import { conEspejo } from "@/offline/espejo";

// ===========================================================================
// Diagnósticos
// ===========================================================================

/**
 * GET /diagnosticos — Requisito 17.1
 *
 * Los tres catálogos se reflejan en el dispositivo porque son la materia prima
 * de la nota: sin diagnósticos, procedimientos y técnicas el formulario no
 * tiene nada que ofrecer y no se puede redactar sin conexión. Además cambian
 * poco, así que una copia local envejece bien.
 */
export async function listarDiagnosticos(): Promise<Diagnostico[]> {
  return conEspejo("catalogo:diagnosticos", async () => {
    const dtos = await request<DiagnosticoDTO[]>("/diagnosticos");
    return dtos.map(diagnosticoToDomain);
  });
}

/** POST /diagnosticos — Requisito 27.2 */
export async function crearDiagnostico(
  diagnostico: Omit<Diagnostico, "id">
): Promise<Diagnostico> {
  const dto = await request<DiagnosticoDTO>("/diagnosticos", {
    method: "POST",
    body: diagnosticoToDto(diagnostico),
  });
  return diagnosticoToDomain(dto);
}

/** PUT /diagnosticos/{id} — Requisito 27.2 */
export async function editarDiagnostico(
  id: number,
  diagnostico: Omit<Diagnostico, "id">
): Promise<Diagnostico> {
  const dto = await request<DiagnosticoDTO>(`/diagnosticos/${id}`, {
    method: "PUT",
    body: diagnosticoToDto({ ...diagnostico, id }),
  });
  return diagnosticoToDomain(dto);
}

/** DELETE /diagnosticos/{id} — Requisito 27.5 */
export async function eliminarDiagnostico(id: number): Promise<void> {
  await request(`/diagnosticos/${id}`, { method: "DELETE" });
}

// ===========================================================================
// Procedimientos
// ===========================================================================

/** GET /procedimientos — Requisito 17.1 */
export async function listarProcedimientos(): Promise<Procedimiento[]> {
  return conEspejo("catalogo:procedimientos", async () => {
    const dtos = await request<ProcedimientoDTO[]>("/procedimientos");
    return dtos.map(procedimientoToDomain);
  });
}

/** POST /procedimientos — Requisito 27.3 */
export async function crearProcedimiento(
  procedimiento: Omit<Procedimiento, "id">
): Promise<Procedimiento> {
  const dto = await request<ProcedimientoDTO>("/procedimientos", {
    method: "POST",
    body: procedimientoToDto(procedimiento),
  });
  return procedimientoToDomain(dto);
}

/** PUT /procedimientos/{id} — Requisito 27.3 */
export async function editarProcedimiento(
  id: number,
  procedimiento: Omit<Procedimiento, "id">
): Promise<Procedimiento> {
  const dto = await request<ProcedimientoDTO>(`/procedimientos/${id}`, {
    method: "PUT",
    body: procedimientoToDto({ ...procedimiento, id }),
  });
  return procedimientoToDomain(dto);
}

/** DELETE /procedimientos/{id} — Requisito 27.5 */
export async function eliminarProcedimiento(id: number): Promise<void> {
  await request(`/procedimientos/${id}`, { method: "DELETE" });
}

// ===========================================================================
// Técnicas
// ===========================================================================

/** GET /tecnicas — Requisito 17.1 */
export async function listarTecnicas(): Promise<Tecnica[]> {
  return conEspejo("catalogo:tecnicas", async () => {
    const dtos = await request<TecnicaDTO[]>("/tecnicas");
    return dtos.map(tecnicaToDomain);
  });
}

/** POST /tecnicas — Requisito 27.4 */
export async function crearTecnica(
  tecnica: Omit<Tecnica, "id">
): Promise<Tecnica> {
  const dto = await request<TecnicaDTO>("/tecnicas", {
    method: "POST",
    body: tecnicaToDto(tecnica),
  });
  return tecnicaToDomain(dto);
}

/** PUT /tecnicas/{id} — Requisito 27.4 */
export async function editarTecnica(
  id: number,
  tecnica: Omit<Tecnica, "id">
): Promise<Tecnica> {
  const dto = await request<TecnicaDTO>(`/tecnicas/${id}`, {
    method: "PUT",
    body: tecnicaToDto({ ...tecnica, id }),
  });
  return tecnicaToDomain(dto);
}

/** DELETE /tecnicas/{id} — Requisito 27.5 */
export async function eliminarTecnica(id: number): Promise<void> {
  await request(`/tecnicas/${id}`, { method: "DELETE" });
}
