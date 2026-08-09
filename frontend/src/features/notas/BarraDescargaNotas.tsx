/**
 * Barra de acciones para la descarga en bloque de notas a PDF.
 * Se muestra sobre el listado y opera sobre lo que hay en pantalla.
 */

import { FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BarraDescargaNotasProps {
  cantidadSeleccionada: number;
  todasMarcadas: boolean;
  onMarcarTodas: (marcar: boolean) => void;
  onDescargar: () => void;
  generando: boolean;
  error: string | null;
}

export function BarraDescargaNotas({
  cantidadSeleccionada,
  todasMarcadas,
  onMarcarTodas,
  onDescargar,
  generando,
  error,
}: BarraDescargaNotasProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
        <Checkbox
          label="Seleccionar todas"
          containerClassName="border-0 bg-transparent px-0 hover:bg-transparent has-[:checked]:border-0 has-[:checked]:bg-transparent"
          checked={todasMarcadas}
          onChange={(e) => onMarcarTodas(e.target.checked)}
        />

        <span className="text-sm text-muted-foreground">
          {cantidadSeleccionada === 0
            ? "Marca las notas que quieras descargar"
            : `${cantidadSeleccionada} ${
                cantidadSeleccionada === 1 ? "nota seleccionada" : "notas seleccionadas"
              }`}
        </span>

        <Button
          type="button"
          size="sm"
          className="ml-auto"
          disabled={cantidadSeleccionada === 0 || generando}
          onClick={onDescargar}
        >
          <FileDown className="mr-2 h-4 w-4" />
          {generando ? "Generando PDF…" : "Descargar PDF"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" role="alert" className="text-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
