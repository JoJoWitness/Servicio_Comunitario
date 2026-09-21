/**
 * Botón de descarga de PDF para la vista de detalle de una nota.
 *
 * Orquesta la obtención de datos (GET /notas/{id} + GET /pacientes/{id}, la
 * cédula si el paciente la tiene y GET /notas/{id}/biopsias para anexar las
 * solicitudes) y delega la generación al módulo NotaPDF.
 *
 * Requisitos: 25.1, 25.2, 25.4
 */

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { descargarNotaPDF } from "./NotaPDF";
import { cedulaParaPDF } from "./cedulaParaPDF";
import { biopsiasDelPacienteParaPDF, biopsiasParaPDF } from "./biopsiasParaPDF";
import { obtenerNota } from "@/api/endpoints/notas";
import { obtenerPaciente } from "@/api/endpoints/pacientes";

interface BotonPDFProps {
  notaId: number;
  pacienteId: string;
}

export function BotonPDF({ notaId, pacienteId }: BotonPDFProps) {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setGenerando(true);
    setError(null);
    try {
      // Req 25.1: combinar GET /notas/{id} + GET /pacientes/{id}
      const [nota, paciente] = await Promise.all([
        obtenerNota(notaId),
        obtenerPaciente(pacienteId),
      ]);
      // Ni la cédula ni las biopsias bloquean la descarga: si no se pueden
      // bajar, la hoja sale con el hueco en blanco y sin anexos, como antes.
      const [cedula, biopsias] = await Promise.all([
        cedulaParaPDF(paciente),
        biopsiasParaPDF(notaId),
      ]);
      // Las demás del paciente solo hacen falta si hay solicitud que anexar.
      const delPaciente =
        biopsias.length > 0 ? await biopsiasDelPacienteParaPDF(pacienteId) : undefined;
      // Req 25.2: generar localmente con @react-pdf/renderer
      await descargarNotaPDF(nota, paciente, cedula, biopsias, delPaciente);
    } catch {
      // Req 25.4: mostrar error y NO generar el documento
      setError(
        "No se pudo generar el PDF. Verifica que los datos de la nota y el paciente estén disponibles."
      );
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
        aria-label="Descargar PDF de la nota operatoria"
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
