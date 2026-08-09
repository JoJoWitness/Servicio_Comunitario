/**
 * Las notas que existen solo en este equipo, arriba del listado del servidor.
 *
 * Van separadas y no mezcladas con las demás a propósito. Una nota pendiente no
 * es una nota más: no la ve nadie del servicio, no está en la historia clínica y
 * si se pierde el equipo se pierde ella. Mezclarla en la lista con el mismo
 * aspecto que las subidas invitaría a darla por guardada, que es justo el
 * malentendido que hay que evitar.
 */

import { AlertTriangle, CloudOff, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { formatFechaUI } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { useAccionesPendiente, usePendientes } from "./useSincronizacion";
import type { NotaPendiente } from "./outbox";

interface Props {
  /** Nombre del paciente, si se puede resolver desde el listado ya cargado. */
  resolverPaciente?: (idPaciente: string) => string | undefined;
}

export function NotasPendientes({ resolverPaciente }: Props) {
  const navigate = useNavigate();
  const { data: pendientes = [] } = usePendientes();
  const { descartar } = useAccionesPendiente();

  const notas = pendientes.filter(
    (p): p is NotaPendiente => p.tipo === "nota"
  );

  if (notas.length === 0) return null;

  return (
    <section className="space-y-2" aria-label="Notas pendientes de subir">
      <div className="flex items-center gap-2">
        <CloudOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <h2 className="text-sm font-medium">
          Pendientes de subir ({notas.length})
        </h2>
      </div>

      <div className="space-y-2">
        {notas.map((pendiente) => {
          const nota = pendiente.datos;
          const paciente = resolverPaciente?.(nota.idPaciente);
          const fallo = pendiente.estado === "error";

          return (
            <Card
              key={pendiente.id}
              className={cn(
                "border-dashed",
                fallo
                  ? "border-destructive/50 bg-destructive/5"
                  : "border-amber-500/50 bg-amber-500/5"
              )}
            >
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium truncate">
                      {nota.intervencionRealizada || "Sin intervención"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatFechaUI(nota.fechaComienzo)}
                      {paciente ? ` · ${paciente}` : ""}
                    </p>
                  </div>

                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none",
                      fallo
                        ? "bg-destructive/15 text-destructive"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    )}
                  >
                    {fallo ? "Rechazada" : "En este equipo"}
                  </span>
                </div>

                {fallo && pendiente.error && (
                  <p className="flex items-start gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span className="break-words">{pendiente.error}</span>
                  </p>
                )}

                <div className="flex gap-3 pt-0.5">
                  <button
                    type="button"
                    onClick={() => navigate(`/notas/pendientes/${pendiente.id}`)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                    Corregir
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Esta nota solo existe en este equipo. Si la descartas se pierde. ¿Continuar?"
                        )
                      ) {
                        void descartar(pendiente.id);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    Descartar
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
