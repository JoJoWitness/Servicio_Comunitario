/**
 * Endpoint de sincronización — POST /sync
 *
 * Sube en un solo viaje todo lo que se redactó sin conexión. Un viaje y no uno
 * por nota a propósito: cuando la señal vuelve suele venir mal, y cada petición
 * extra es otra oportunidad de que se corte a la mitad.
 *
 * El servidor responde ítem por ítem, nunca "todo bien" o "todo mal": una nota
 * con un dato inválido no debe impedir que suban las demás.
 *
 * @see server/controllers/sync.go
 */

import type { Biopsia, Nota, Paciente } from "../../domain/models";
import { biopsiaToDto, type BiopsiaDTO } from "../dto/biopsia.dto";
import { notaToDto, type NotaDTO } from "../dto/nota.dto";
import { pacienteToWriteDto, type PacienteDTO } from "../dto/paciente.dto";
import { request } from "../httpClient";

/** Veredicto del servidor sobre un ítem del lote. */
export type EstadoSync = "creado" | "duplicado" | "error";

export interface ResultadoSync {
  /** El id con el que el dispositivo conoce ese ítem. */
  cliente_id: string;
  estado: EstadoSync;
  /** Id definitivo de la nota en el servidor. */
  nota_id?: number;
  motivo?: string;
}

export interface RespuestaSync {
  pacientes: ResultadoSync[];
  notas: ResultadoSync[];
  /** Ausente en servidores anteriores a v0.5.0. */
  biopsias?: ResultadoSync[];
}

/** Lo que se manda: el paciente lleva su id, la nota su client_uuid. */
interface CuerpoSync {
  pacientes: (Omit<PacienteDTO, "id"> & {
    id: string;
    /** Cédula adjuntada sin conexión, en base64 sin prefijo. */
    cedula_base64?: string;
    cedula_content_type?: string;
  })[];
  notas: (NotaDTO & { client_uuid: string })[];
  biopsias: (BiopsiaDTO & {
    client_uuid: string;
    nota_id?: number;
    nota_client_uuid?: string;
  })[];
}

export interface LotePendiente {
  pacientes: {
    paciente: Paciente;
    /** Cédula ya codificada, si el paciente la traía en la cola. */
    cedulaBase64?: string;
    cedulaContentType?: string;
  }[];
  notas: { clientUuid: string; nota: Nota; medicoEncargadoId: string }[];
  biopsias: {
    clientUuid: string;
    biopsia: Biopsia;
    notaId?: number;
    notaClientUuid?: string;
  }[];
}

/**
 * Sube el lote y devuelve el veredicto de cada ítem.
 *
 * Lanza `RedError` si no hay red (la cola se queda intacta y se reintenta) o
 * `ApiError` si el servidor rechaza la petición entera —por ejemplo un 401 con
 * la sesión vencida, que exige volver a entrar antes de reintentar—.
 */
export async function sincronizarPendientes(
  lote: LotePendiente
): Promise<RespuestaSync> {
  const cuerpo: CuerpoSync = {
    // El id va explícito: es el UUID que generó el dispositivo y con el que la
    // nota ya referencia a este paciente. El DTO de escritura normal lo omite
    // porque en línea lo asigna el servidor.
    pacientes: lote.pacientes.map(({ paciente, cedulaBase64, cedulaContentType }) => ({
      ...pacienteToWriteDto(paciente),
      id: paciente.id,
      cedula_base64: cedulaBase64,
      cedula_content_type: cedulaContentType,
    })),
    notas: lote.notas.map(({ clientUuid, nota, medicoEncargadoId }) => ({
      ...notaToDto(nota, { medicoEncargadoId }),
      client_uuid: clientUuid,
    })),
    // Al final: cada una apunta a su nota de origen, que va antes en el lote.
    biopsias: lote.biopsias.map(({ clientUuid, biopsia, notaId, notaClientUuid }) => ({
      ...biopsiaToDto(biopsia),
      client_uuid: clientUuid,
      nota_id: notaId,
      nota_client_uuid: notaClientUuid,
    })),
  };

  return request<RespuestaSync>("/sync", { method: "POST", body: cuerpo });
}
