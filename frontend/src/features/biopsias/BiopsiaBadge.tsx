/**
 * Insignia del estado de una biopsia. Lleva texto, no solo color.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EstadoBiopsia } from "@/domain/models";

export const ETIQUETA_ESTADO: Record<EstadoBiopsia, string> = {
  tomada: "Tomada",
  enviada: "Enviada",
  con_resultado: "Con resultado",
  entregada: "Entregada",
};

const CLASE_ESTADO: Record<EstadoBiopsia, string> = {
  tomada: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  enviada: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  con_resultado: "border-primary/40 bg-primary/10 text-primary",
  entregada: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export function BiopsiaBadge({
  estado,
  className,
}: {
  estado: EstadoBiopsia;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", CLASE_ESTADO[estado], className)}>
      {ETIQUETA_ESTADO[estado]}
    </Badge>
  );
}
