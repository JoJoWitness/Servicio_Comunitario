/**
 * Lecturas de biopsias para los PDF. Ninguna lanza: igual que la cédula, la
 * solicitud es un complemento de la hoja. Si la red falla a medio camino, la
 * nota se imprime igual y la solicitud se baja aparte desde el panel de la
 * biopsia cuando vuelva la señal.
 */

import { biopsiasDeNota, biopsiasDePaciente } from "@/api/endpoints/biopsias";
import type { Biopsia } from "@/domain/models";

/** Las biopsias ligadas a una nota, para anexar su solicitud a la hoja. */
export async function biopsiasParaPDF(notaId?: number): Promise<Biopsia[]> {
  if (notaId === undefined) return [];
  try {
    return await biopsiasDeNota(notaId);
  } catch {
    return [];
  }
}

/** Todas las biopsias del paciente, para "Biopsias anteriores". */
export async function biopsiasDelPacienteParaPDF(pacienteId: string): Promise<Biopsia[]> {
  try {
    return await biopsiasDePaciente(pacienteId);
  } catch {
    return [];
  }
}

/** Lo que la solicitud dice en "Biopsias anteriores: NO / SÍ · Resultado". */
export interface BiopsiasAnteriores {
  cantidad: number;
  /** Resultado de la anterior más reciente que ya tenga informe. */
  resultado?: string;
}

/**
 * Cuenta las biopsias del paciente tomadas antes que `biopsia` y toma el
 * resultado de la más reciente con informe. Con `todas` en `undefined` (no se
 * pudieron bajar) devuelve `undefined`, y la hoja deja las casillas vacías.
 */
export function anterioresDe(
  biopsia: Biopsia,
  todas?: Biopsia[]
): BiopsiasAnteriores | undefined {
  if (!todas) return undefined;
  const previas = todas
    .filter(
      (b) =>
        b.id !== biopsia.id && b.fechaToma.getTime() < biopsia.fechaToma.getTime()
    )
    .sort((a, b) => b.fechaToma.getTime() - a.fechaToma.getTime());
  const conInforme = previas.find((b) => b.resultado?.trim());
  return { cantidad: previas.length, resultado: conInforme?.resultado?.trim() };
}
