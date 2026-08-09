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

import type { Nota, Paciente } from "../../domain/models";
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
}

/** Lo que se manda: el paciente lleva su id, la nota su client_uuid. */
interface CuerpoSync {
  pacientes: (PacienteDTO | (Omit<PacienteDTO, "id"> & { id: string }))[];
  notas: (NotaDTO & { client_uuid: string })[];
}

export interface LotePendiente {
  pacientes: Paciente[];
  notas: { clientUuid: string; nota: Nota; medicoEncargadoId: string }[];
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
    pacientes: lote.pacientes.map((p) => ({
      ...pacienteToWriteDto(p),
      id: p.id,
    })),
    notas: lote.notas.map(({ clientUuid, nota, medicoEncargadoId }) => ({
      ...notaToDto(nota, { medicoEncargadoId }),
      client_uuid: clientUuid,
    })),
  };

  return request<RespuestaSync>("/sync", { method: "POST", body: cuerpo });
}
