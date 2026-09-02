/**
 * Elegir, entre las biopsias del mismo paciente, una que todavía no esté
 * ligada a esta nota, y vincularla como seguimiento. Es el caso de la
 * reintervención motivada por un resultado.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBiopsiasDePaciente, useVincularBiopsia } from "@/hooks/useBiopsias";
import { isApiError } from "@/api/errors";
import { formatFechaUI } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { BiopsiaBadge } from "./BiopsiaBadge";

interface VincularBiopsiaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notaId: number;
  idPaciente: string;
  /** Ids ya vinculados a esta nota, para no ofrecerlos. */
  yaVinculadas: number[];
}

export function VincularBiopsiaDialog({
  open,
  onOpenChange,
  notaId,
  idPaciente,
  yaVinculadas,
}: VincularBiopsiaDialogProps) {
  const { data: biopsias = [], isLoading } = useBiopsiasDePaciente(idPaciente);
  const { mutateAsync: vincular, isPending } = useVincularBiopsia(notaId);
  const [elegida, setElegida] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const candidatas = biopsias.filter((b) => b.id !== undefined && !yaVinculadas.includes(b.id));

  const confirmar = async () => {
    if (elegida === null) return;
    setError(null);
    try {
      await vincular({ biopsiaId: elegida, rol: "seguimiento" });
      onOpenChange(false);
      setElegida(null);
    } catch (err) {
      setError(isApiError(err) ? err.body || "No se pudo vincular." : "No se pudo vincular.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular una biopsia existente</DialogTitle>
          <DialogDescription>
            Solo se ofrecen biopsias de este paciente. Quedará ligada a esta
            nota como seguimiento; su cirugía de origen no cambia.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground" role="status">Cargando…</p>
        ) : candidatas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            El paciente no tiene otras biopsias que vincular.
          </p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto" role="listbox" aria-label="Biopsias del paciente">
            {candidatas.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={elegida === b.id}
                  onClick={() => setElegida(b.id!)}
                  className={cn(
                    "flex w-full flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent/50",
                    elegida === b.id && "border-primary bg-primary/10"
                  )}
                >
                  <span>
                    <span className="font-medium">{b.tejido}</span>
                    {b.ojo && <span className="text-muted-foreground"> · {b.ojo}</span>}
                    <span className="block text-xs text-muted-foreground">
                      Tomada el {formatFechaUI(b.fechaToma)}
                      {b.numeroPatologia ? ` · ${b.numeroPatologia}` : ""}
                    </span>
                  </span>
                  <BiopsiaBadge estado={b.estado} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => void confirmar()} disabled={elegida === null || isPending}>
            {isPending ? "Vinculando…" : "Vincular"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
