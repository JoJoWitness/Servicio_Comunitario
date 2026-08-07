/**
 * Exportación del record quirúrgico a Excel.
 *
 * Ofrece los períodos que el servicio pide de forma habitual como un clic
 * (último mes, 3, 6 y 12 meses, o todo el historial) y, para lo demás, un rango
 * libre. El archivo lo arma el backend: aquí solo se dispara la descarga.
 */

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportarRecordQuirurgico } from "@/api/endpoints/notas";
import { isApiError } from "@/api/errors";
import { rangoUltimosMeses } from "@/lib/datetime";
import type { RangoFechas } from "@/domain/models";

/** Accesos rápidos, en meses. `undefined` es el historial completo. */
const ATAJOS: { etiqueta: string; meses?: number }[] = [
  { etiqueta: "Último mes", meses: 1 },
  { etiqueta: "Últimos 3 meses", meses: 3 },
  { etiqueta: "Últimos 6 meses", meses: 6 },
  { etiqueta: "Último año", meses: 12 },
  { etiqueta: "Todo el historial" },
];

/** Dispara la descarga del blob con el nombre que propuso el servidor. */
function descargar(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportarRecord() {
  const [descargando, setDescargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const exportar = async (clave: string, rango?: RangoFechas) => {
    setError(null);
    setDescargando(clave);
    try {
      const { blob, nombreArchivo } = await exportarRecordQuirurgico(rango);
      descargar(blob, nombreArchivo);
    } catch (err) {
      // El backend responde el motivo en texto plano. Mostrarlo evita el
      // "intenta de nuevo" que no dice nada cuando el fallo es del servidor.
      setError(
        isApiError(err) && err.body
          ? `No se pudo generar el archivo (${err.status}): ${err.body}`
          : "No se pudo generar el archivo. Verifica la conexión."
      );
    } finally {
      setDescargando(null);
    }
  };

  const rangoInvertido = Boolean(desde && hasta && hasta < desde);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-4 w-4" />
          Exportar record quirúrgico
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {ATAJOS.map(({ etiqueta, meses }) => (
            <Button
              key={etiqueta}
              type="button"
              size="sm"
              variant="outline"
              disabled={descargando !== null}
              onClick={() =>
                exportar(
                  etiqueta,
                  meses === undefined ? undefined : rangoUltimosMeses(meses)
                )
              }
            >
              {descargando === etiqueta ? "Generando…" : etiqueta}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div className="space-y-1">
            <Label htmlFor="export-desde">Desde</Label>
            <DateInput
              id="export-desde"
              value={desde}
              onChange={setDesde}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="export-hasta">Hasta</Label>
            <DateInput
              id="export-hasta"
              value={hasta}
              onChange={setHasta}
              className="w-40"
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={
              descargando !== null || (!desde && !hasta) || rangoInvertido
            }
            onClick={() =>
              exportar("libre", {
                from: desde || undefined,
                to: hasta || undefined,
              })
            }
          >
            <Download className="mr-2 h-4 w-4" />
            {descargando === "libre" ? "Generando…" : "Exportar rango"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Dejar un extremo vacío deja el rango abierto por ese lado.
        </p>

        {rangoInvertido && (
          <p className="text-sm text-destructive">
            La fecha «hasta» no puede ser anterior a la fecha «desde».
          </p>
        )}

        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
