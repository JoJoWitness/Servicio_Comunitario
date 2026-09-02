/**
 * La cédula del paciente lista para `Image` de react-pdf: un data URI, o
 * `undefined` si el paciente no la tiene o no se pudo bajar.
 *
 * Nunca lanza. La cédula es un complemento de la hoja, no un requisito: si la
 * red falla a medio camino, la nota se imprime igual con el hueco en blanco,
 * que es lo que el servicio venía haciendo hasta ahora.
 */

import { obtenerCedula } from "@/api/endpoints/pacientes";
import { blobADataURI } from "@/lib/imagen";
import type { Paciente } from "@/domain/models";

export async function cedulaParaPDF(paciente: Paciente): Promise<string | undefined> {
  if (!paciente.tieneCedula) return undefined;
  try {
    const blob = await obtenerCedula(paciente.id);
    return blob ? await blobADataURI(blob) : undefined;
  } catch {
    return undefined;
  }
}
