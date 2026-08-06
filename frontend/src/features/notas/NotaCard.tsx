/**
 * Ítem de nota para listados — muestra fecha, paciente/intervención, encargado y pabellón.
 * Reutilizado por MisNotasPage y TodasNotasPage.
 *
 * Requisitos: 18.3, 12.4
 */

import { useNavigate } from "react-router-dom";
import { formatFechaUI } from "@/lib/datetime";
import type { Nota } from "@/domain/models";

interface NotaCardProps {
  nota: Nota;
  /** Si true muestra el paciente; si false muestra la intervención como título */
  mostrarPaciente?: boolean;
  /** Nombre del paciente (cuando mostrarPaciente=true) */
  nombrePaciente?: string;
}

export function NotaCard({ nota, mostrarPaciente = true, nombrePaciente }: NotaCardProps) {
  const navigate = useNavigate();

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex items-start justify-between rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => navigate(`/notas/${nota.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") navigate(`/notas/${nota.id}`);
      }}
      aria-label={`Ver nota del ${formatFechaUI(nota.fechaComienzo)}`}
    >
      <div className="space-y-1 flex-1 min-w-0">
        {/* Fecha — siempre visible */}
        <p className="text-xs text-muted-foreground">{formatFechaUI(nota.fechaComienzo)}</p>

        {/* Título principal */}
        <p className="font-medium text-sm truncate">
          {mostrarPaciente && nombrePaciente
            ? nombrePaciente
            : nota.intervencionRealizada}
        </p>

        {/* Subtítulo */}
        {mostrarPaciente && (
          <p className="text-sm text-muted-foreground truncate">
            {nota.intervencionRealizada}
          </p>
        )}
      </div>

      <div className="ml-4 flex flex-col items-end gap-1 shrink-0">
        {nota.pabellon && (
          <span className="text-xs text-muted-foreground">Pab. {nota.pabellon}</span>
        )}
        {nota.medicoEncargado && (
          <span className="text-xs text-muted-foreground truncate max-w-32">
            {nota.medicoEncargado}
          </span>
        )}
      </div>
    </div>
  );
}
