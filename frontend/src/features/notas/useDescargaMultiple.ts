/**
 * Selección de notas de un listado y descarga en bloque a PDF.
 *
 * Las tarjetas solo traen la nota resumida, así que antes de generar el PDF hay
 * que pedir cada nota completa y su paciente. Se hace en paralelo y el
 * resultado sale en un único archivo con una hoja por nota.
 */

import { useCallback, useMemo, useState } from "react";

import { descargarNotasPDF } from "@/features/pdf/NotaPDF";
import { cedulaParaPDF } from "@/features/pdf/cedulaParaPDF";
import { biopsiasDelPacienteParaPDF, biopsiasParaPDF } from "@/features/pdf/biopsiasParaPDF";
import { obtenerNota } from "@/api/endpoints/notas";
import { obtenerPaciente } from "@/api/endpoints/pacientes";
import type { Nota } from "@/domain/models";

/** Aplica `fn` a cada elemento con como mucho `limite` en vuelo a la vez. */
async function enLotes<T, R>(
  items: T[],
  limite: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const resultados: R[] = new Array(items.length);
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < items.length) {
      const i = siguiente++;
      resultados[i] = await fn(items[i]!);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limite, items.length) }, trabajador)
  );
  return resultados;
}

export function useDescargaMultiple(notas: Nota[]) {
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idsVisibles = useMemo(
    () => notas.map((n) => n.id).filter((id): id is number => id !== undefined),
    [notas]
  );

  // Al cambiar de página o de filtro desaparecen notas de la lista; se
  // descartan de la selección para no descargar algo que ya no se ve.
  const seleccionadas = useMemo(
    () => seleccion.filter((id) => idsVisibles.includes(id)),
    [seleccion, idsVisibles]
  );

  const alternar = useCallback((id: number, marcada: boolean) => {
    setSeleccion((previa) =>
      marcada ? [...new Set([...previa, id])] : previa.filter((x) => x !== id)
    );
  }, []);

  const marcarTodas = useCallback(
    (marcar: boolean) => setSeleccion(marcar ? idsVisibles : []),
    [idsVisibles]
  );

  const descargar = useCallback(async () => {
    if (seleccionadas.length === 0) return;
    setGenerando(true);
    setError(null);
    try {
      // De a pocas a la vez: cada nota trae hasta cuatro peticiones (nota,
      // paciente, cédula, biopsias) y veinte notas de golpe saturan la red
      // del hospital.
      const items = await enLotes(seleccionadas, 4, async (id) => {
        const nota = await obtenerNota(id);
        const paciente = await obtenerPaciente(nota.idPaciente);
        const [cedula, biopsias] = await Promise.all([
          cedulaParaPDF(paciente),
          biopsiasParaPDF(id),
        ]);
        const biopsiasDelPaciente =
          biopsias.length > 0 ? await biopsiasDelPacienteParaPDF(paciente.id) : undefined;
        return { nota, paciente, cedula, biopsias, biopsiasDelPaciente };
      });
      await descargarNotasPDF(items);
      setSeleccion([]);
    } catch {
      setError(
        "No se pudieron generar los PDF. Verifica que las notas y sus pacientes estén disponibles."
      );
    } finally {
      setGenerando(false);
    }
  }, [seleccionadas]);

  return {
    seleccionadas,
    generando,
    error,
    estaSeleccionada: (id?: number) => id !== undefined && seleccionadas.includes(id),
    alternar,
    marcarTodas,
    todasMarcadas:
      idsVisibles.length > 0 && seleccionadas.length === idsVisibles.length,
    descargar,
  };
}
