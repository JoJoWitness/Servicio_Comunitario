/**
 * Botón de descarga de la solicitud de biopsia, para el panel de la biopsia.
 *
 * Pide el paciente (obligatorio: sin él no hay a quién hacerle la solicitud),
 * la nota de origen para los ayudantes y las demás biopsias del paciente para
 * marcar "Biopsias anteriores" y su resultado. Esos dos últimos son
 * complementos: si fallan, la solicitud sale con esos renglones en blanco.
 */

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { descargarBiopsiaPDF } from "./BiopsiaPDF";
import { anterioresDe, biopsiasDelPacienteParaPDF } from "./biopsiasParaPDF";
import { obtenerNota } from "@/api/endpoints/notas";
import { obtenerPaciente } from "@/api/endpoints/pacientes";
import type { Biopsia } from "@/domain/models";

export function BotonBiopsiaPDF({ biopsia }: { biopsia: Biopsia }) {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setGenerando(true);
    setError(null);
    try {
      const origen = biopsia.notas.find((n) => n.rol === "origen") ?? biopsia.notas[0];
      const [paciente, nota, delPaciente] = await Promise.all([
        obtenerPaciente(biopsia.idPaciente),
        origen ? obtenerNota(origen.idNota).catch(() => undefined) : Promise.resolve(undefined),
        biopsiasDelPacienteParaPDF(biopsia.idPaciente),
      ]);
      await descargarBiopsiaPDF({
        biopsia,
        paciente,
        nota,
        anteriores: anterioresDe(biopsia, delPaciente),
      });
    } catch {
      setError("No se pudo generar el PDF. Verifica que los datos del paciente estén disponibles.");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={generando}
        aria-label="Descargar solicitud de biopsia en PDF"
      >
        <FileDown className="mr-2 h-4 w-4" />
        {generando ? "Generando PDF…" : "Descargar PDF"}
      </Button>
      {error && (
        <Alert variant="destructive" role="alert" className="text-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
