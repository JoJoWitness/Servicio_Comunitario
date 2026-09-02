/**
 * Línea de tiempo del ciclo de la biopsia: tomada → enviada → con resultado →
 * entregada. Los pasos alcanzados muestran su fecha; el siguiente lleva el
 * botón que lo dispara, con un diálogo que pide solo lo que ese estado exige.
 */

import { useState } from "react";
import { Check, Circle, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AutocompleteInput } from "@/features/notas/AutocompleteInput";
import { aISOLocal, formatFechaUI } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { ESTADOS_BIOPSIA, type Biopsia, type EstadoBiopsia } from "@/domain/models";
import { ETIQUETA_ESTADO } from "./BiopsiaBadge";
import { LABORATORIOS_BIOPSIA } from "./tejidos";

/** Cambios que produce avanzar a un estado. */
export type AvanceBiopsia = Partial<
  Pick<
    Biopsia,
    | "laboratorio"
    | "fechaEnvio"
    | "numeroPatologia"
    | "resultado"
    | "fechaResultado"
    | "fechaEntrega"
  >
> & { estado: EstadoBiopsia };

interface LineaTiempoBiopsiaProps {
  biopsia: Biopsia;
  /** Puede marcar enviada y cargar resultado. */
  puedeTramitar: boolean;
  /** Puede marcar entregada y corregir datos. */
  puedeEditar: boolean;
  /** Puede volver a un estado anterior (admin, responsable). */
  puedeRetroceder: boolean;
  onAvanzar: (avance: AvanceBiopsia) => Promise<void>;
  onRetroceder: (estado: EstadoBiopsia) => Promise<void>;
  guardando?: boolean;
}

const ACCION: Record<EstadoBiopsia, string> = {
  tomada: "Registrar toma",
  enviada: "Marcar como enviada",
  con_resultado: "Cargar resultado",
  entregada: "Marcar como entregada",
};

function fechaDe(b: Biopsia, estado: EstadoBiopsia): Date | undefined {
  switch (estado) {
    case "tomada":
      return b.fechaToma;
    case "enviada":
      return b.fechaEnvio;
    case "con_resultado":
      return b.fechaResultado;
    case "entregada":
      return b.fechaEntrega;
  }
}

export function LineaTiempoBiopsia({
  biopsia,
  puedeTramitar,
  puedeEditar,
  puedeRetroceder,
  onAvanzar,
  onRetroceder,
  guardando = false,
}: LineaTiempoBiopsiaProps) {
  const actual = ESTADOS_BIOPSIA.indexOf(biopsia.estado);
  const siguiente = ESTADOS_BIOPSIA[actual + 1];
  const anterior = actual > 0 ? ESTADOS_BIOPSIA[actual - 1] : undefined;

  const [paso, setPaso] = useState<EstadoBiopsia | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hoy = aISOLocal(new Date());
  const [laboratorio, setLaboratorio] = useState("");
  const [fechaEnvio, setFechaEnvio] = useState(hoy);
  const [numeroPatologia, setNumeroPatologia] = useState("");
  const [resultado, setResultado] = useState("");
  const [fechaResultado, setFechaResultado] = useState(hoy);
  const [fechaEntrega, setFechaEntrega] = useState(hoy);

  const abrir = (estado: EstadoBiopsia) => {
    setError(null);
    setLaboratorio(biopsia.laboratorio ?? "");
    setNumeroPatologia(biopsia.numeroPatologia ?? "");
    setResultado(biopsia.resultado ?? "");
    setFechaEnvio(hoy);
    setFechaResultado(hoy);
    setFechaEntrega(hoy);
    setPaso(estado);
  };

  const puedeDisparar = (estado: EstadoBiopsia) =>
    estado === "entregada" ? puedeEditar : puedeTramitar;

  const confirmar = async () => {
    if (!paso) return;
    setError(null);
    let avance: AvanceBiopsia;
    switch (paso) {
      case "enviada":
        if (!fechaEnvio) return setError("Indica la fecha de envío.");
        avance = {
          estado: "enviada",
          laboratorio: laboratorio.trim() || undefined,
          fechaEnvio: new Date(fechaEnvio),
          numeroPatologia: numeroPatologia.trim() || undefined,
        };
        break;
      case "con_resultado":
        if (!resultado.trim()) return setError("Escribe el resultado del informe.");
        if (!fechaResultado) return setError("Indica la fecha del resultado.");
        avance = {
          estado: "con_resultado",
          numeroPatologia: numeroPatologia.trim() || undefined,
          resultado: resultado.trim(),
          fechaResultado: new Date(fechaResultado),
          // Una muestra cargada directo con resultado implica que se envió.
          fechaEnvio: biopsia.fechaEnvio ?? new Date(fechaResultado),
          laboratorio: biopsia.laboratorio ?? (laboratorio.trim() || undefined),
        };
        break;
      case "entregada":
        if (!fechaEntrega) return setError("Indica la fecha de entrega.");
        avance = { estado: "entregada", fechaEntrega: new Date(fechaEntrega) };
        break;
      default:
        return;
    }
    try {
      await onAvanzar(avance);
      setPaso(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  };

  const retroceder = async () => {
    if (!anterior) return;
    const ok = window.confirm(
      `Se volverá al estado "${ETIQUETA_ESTADO[anterior]}" y se borrarán los datos del estado actual. ¿Continuar?`
    );
    if (!ok) return;
    await onRetroceder(anterior);
  };

  return (
    <div className="space-y-3">
      <ol className="space-y-3" aria-label="Ciclo de la biopsia">
        {ESTADOS_BIOPSIA.map((estado, i) => {
          const alcanzado = i <= actual;
          const esActual = i === actual;
          const esSiguiente = estado === siguiente;
          const fecha = fechaDe(biopsia, estado);
          return (
            <li
              key={estado}
              aria-current={esActual ? "step" : undefined}
              className="flex items-start gap-3"
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  alcanzado
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40 text-muted-foreground"
                )}
                aria-hidden
              >
                {alcanzado ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
                <div>
                  <p className={cn("text-sm", esActual ? "font-medium" : "")}>
                    {ETIQUETA_ESTADO[estado]}
                  </p>
                  {alcanzado && fecha && (
                    <p className="text-xs text-muted-foreground">{formatFechaUI(fecha)}</p>
                  )}
                </div>
                {esSiguiente && puedeDisparar(estado) && (
                  <Button size="sm" variant="outline" disabled={guardando} onClick={() => abrir(estado)}>
                    {ACCION[estado]}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {anterior && puedeRetroceder && (
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          disabled={guardando}
          onClick={() => void retroceder()}
        >
          <Undo2 className="mr-2 h-4 w-4" />
          Volver a «{ETIQUETA_ESTADO[anterior]}»
        </Button>
      )}

      <Dialog open={paso !== null} onOpenChange={(v) => !v && setPaso(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{paso ? ACCION[paso] : ""}</DialogTitle>
            <DialogDescription>
              {paso === "enviada" && "Registra a dónde y cuándo salió la muestra."}
              {paso === "con_resultado" && "Transcribe el informe de anatomía patológica."}
              {paso === "entregada" && "Constancia de que el resultado se le comunicó al paciente."}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {paso === "enviada" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="t-lab">Laboratorio</Label>
                <AutocompleteInput
                  id="t-lab"
                  value={laboratorio}
                  onChange={setLaboratorio}
                  opciones={LABORATORIOS_BIOPSIA}
                  permitirExplorar
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="t-fenvio">Fecha de envío *</Label>
                  <DateInput id="t-fenvio" value={fechaEnvio} onChange={setFechaEnvio} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-num">N.° de patología</Label>
                  <Input id="t-num" value={numeroPatologia} onChange={(e) => setNumeroPatologia(e.target.value)} placeholder="AP-2026-0412" />
                </div>
              </div>
            </div>
          )}

          {paso === "con_resultado" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="t-fres">Fecha del resultado *</Label>
                  <DateInput id="t-fres" value={fechaResultado} onChange={setFechaResultado} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-num2">N.° de patología</Label>
                  <Input id="t-num2" value={numeroPatologia} onChange={(e) => setNumeroPatologia(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="t-res">Resultado *</Label>
                <Textarea id="t-res" rows={6} value={resultado} onChange={(e) => setResultado(e.target.value)} placeholder="Diagnóstico histopatológico, bordes, observaciones del patólogo…" />
              </div>
            </div>
          )}

          {paso === "entregada" && (
            <div className="space-y-1">
              <Label htmlFor="t-fent">Fecha de entrega *</Label>
              <DateInput id="t-fent" value={fechaEntrega} onChange={setFechaEntrega} />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaso(null)}>Cancelar</Button>
            <Button onClick={() => void confirmar()} disabled={guardando}>
              {guardando ? "Guardando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
