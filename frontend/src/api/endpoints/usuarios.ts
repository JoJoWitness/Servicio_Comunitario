/**
 * Endpoints de Usuarios (administración — solo admin).
 *
 * Rutas cubiertas:
 * - GET    /usuarios        → listarUsuarios
 * - POST   /usuarios        → crearUsuario
 * - PUT    /usuarios/{id}   → editarUsuario
 * - DELETE /usuarios/{id}   → desactivarUsuario (baja lógica)
 *
 * También usado para poblar el selector de equipo quirúrgico — Requisito 16.1.
 *
 * Requisitos: 16.1, 28.1, 28.2, 28.3, 28.4
 */

import type { Rol, Usuario } from "../../domain/models";
import type { UsuarioDTO } from "../dto/usuario.dto";
import { usuarioToDomain } from "../dto/usuario.dto";
import { isRedError } from "../errors";
import { request } from "../httpClient";
import type { FiltrosUsuariosParams, PaginatedResponse, PaginationParams } from "../types";
import { buildFilterQuery, coincide, paginarEnLocal, TAMANO_PAGINA_MAX } from "./queryUtils";
import { listaReflejada, reflejar } from "@/offline/espejo";

// ---------------------------------------------------------------------------
// Tipos de entrada
// ---------------------------------------------------------------------------

export interface CrearUsuarioInput {
  correo: string;
  nombres: string;
  apellidos: string;
  rol: Rol;
  contrasena: string;
}

export interface EditarUsuarioInput {
  correo?: string;
  nombres?: string;
  apellidos?: string;
  rol?: Rol;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/**
 * Obtiene la lista paginada de usuarios.
 * GET /usuarios[?nombre=&correo=&rol=&page=&size=&sortBy=&order=]
 */
export async function listarUsuarios(
  filtros?: FiltrosUsuariosParams,
  params?: PaginationParams
): Promise<PaginatedResponse<Usuario>> {
  try {
    return await pedirUsuarios(filtros, params);
  } catch (error) {
    // Sin red: espejo, filtrando y paginando aquí mismo.
    if (!isRedError(error)) throw error;

    const espejo = await listaReflejada<Usuario>("medicos");
    if (!espejo) throw error;
    return paginarEnLocal(filtrarUsuarios(espejo, filtros), params);
  }
}

async function pedirUsuarios(
  filtros?: FiltrosUsuariosParams,
  params?: PaginationParams
): Promise<PaginatedResponse<Usuario>> {
  const qs = buildFilterQuery(filtros as Record<string, string | undefined>, params);
  const raw = await request<PaginatedResponse<UsuarioDTO>>(`/usuarios${qs}`);
  return {
    data: raw.data
      .filter((d) => d && typeof d === "object" && "id" in d)
      .map(usuarioToDomain),
    meta: raw.meta,
  };
}

function filtrarUsuarios(
  usuarios: Usuario[],
  filtros?: FiltrosUsuariosParams
): Usuario[] {
  if (!filtros) return usuarios;

  return usuarios.filter((u) => {
    if (filtros.nombre && !coincide(`${u.nombres} ${u.apellidos}`, filtros.nombre)) return false;
    if (filtros.correo && !coincide(u.correo, filtros.correo)) return false;
    if (filtros.rol && u.rol !== filtros.rol) return false;
    return true;
  });
}

/**
 * El listado entero, página a página. Llena el selector de equipo quirúrgico
 * (HU-15) y es el único que escribe el espejo: una página suelta lo dejaría
 * incompleto.
 */
export async function todosLosUsuarios(): Promise<Usuario[]> {
  try {
    const acumulado: Usuario[] = [];
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const respuesta = await pedirUsuarios(undefined, {
        page: pagina,
        size: TAMANO_PAGINA_MAX,
      });
      acumulado.push(...respuesta.data);
      totalPaginas = respuesta.meta?.totalPages ?? 1;
      pagina++;
    } while (pagina <= totalPaginas && pagina <= LIMITE_PAGINAS);

    await reflejar("medicos", acumulado);
    return acumulado;
  } catch (error) {
    if (!isRedError(error)) throw error;

    const espejo = await listaReflejada<Usuario>("medicos");
    if (!espejo) throw error;
    return espejo;
  }
}

/** Tope por si el meta viniera mal. */
const LIMITE_PAGINAS = 50;

/**
 * Crea un usuario nuevo (admin).
 * POST /usuarios
 *
 * Requisito 28.2
 */
export async function crearUsuario(input: CrearUsuarioInput): Promise<Usuario> {
  const dto = await request<UsuarioDTO>("/usuarios", {
    method: "POST",
    body: input,
  });
  return usuarioToDomain(dto);
}

/**
 * Actualiza los datos o el rol de un usuario.
 * PUT /usuarios/{id}
 *
 * Requisitos 28.3, 28.5
 */
export async function editarUsuario(
  id: string,
  datos: EditarUsuarioInput
): Promise<Usuario> {
  const dto = await request<UsuarioDTO>(`/usuarios/${id}`, {
    method: "PUT",
    body: datos,
  });
  return usuarioToDomain(dto);
}

/**
 * Desactiva (baja lógica) un usuario.
 * DELETE /usuarios/{id}
 *
 * Requisito 28.4
 */
export async function desactivarUsuario(id: string): Promise<void> {
  await request(`/usuarios/${id}`, { method: "DELETE" });
}
