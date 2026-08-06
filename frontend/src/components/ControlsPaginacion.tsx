/**
 * Controles de paginación reutilizables.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ControlsPaginacionProps {
  pagina: number;
  totalPaginas: number;
  total: number;
  hayAnterior: boolean;
  haySiguiente: boolean;
  anterior: () => void;
  siguiente: () => void;
}

export function ControlsPaginacion({
  pagina,
  totalPaginas,
  total,
  hayAnterior,
  haySiguiente,
  anterior,
  siguiente,
}: ControlsPaginacionProps) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="flex items-center justify-between px-1 pt-2">
      <p className="text-xs text-muted-foreground">
        {total} resultado{total !== 1 ? "s" : ""} · Página {pagina} de {totalPaginas}
      </p>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={anterior}
          disabled={!hayAnterior}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={siguiente}
          disabled={!haySiguiente}
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
