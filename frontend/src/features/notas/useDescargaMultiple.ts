/**
 * Selección de notas de un listado y descarga en bloque a PDF.
 *
 * Las tarjetas solo traen la nota resumida, así que antes de generar el PDF hay
 * que pedir cada nota completa y su paciente. Se hace en paralelo y el
 * resultado sale en un único archivo con una hoja por nota.
 */

import { useCallback, useMemo, useState } from "react";

import { descargarNotasPDF } from "@/features/pdf/NotaPDF";
import { obtenerNota } from "@/api/endpoints/notas";
import { obtenerPaciente } from "@/api/endpoints/pacientes";
import type { Nota } from "@/domain/models";

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
      const items = await Promise.all(
        seleccionadas.map(async (id) => {
          const nota = await obtenerNota(id);
          const paciente = await obtenerPaciente(nota.idPaciente);
          return { nota, paciente };
        })
      );
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
