/**
 * Ítem de nota para listados — muestra fecha, paciente/intervención, encargado
 * y la insignia de legalización. Reutilizado por MisNotasPage y TodasNotasPage.
 *
 * En pantallas angostas apila todo en una columna; desde `sm` recupera las dos
 * columnas (datos a la izquierda, equipo a la derecha).
 *
 * Requisitos: 18.3, 12.4
 */

import { useNavigate } from "react-router-dom";
import { Stamp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatFechaUI } from "@/lib/datetime";
import type { Nota } from "@/domain/models";

interface NotaCardProps {
  nota: Nota;
  /** Si true muestra el paciente; si false muestra la intervención como título */
  mostrarPaciente?: boolean;
  /** Nombre del paciente (cuando mostrarPaciente=true) */
  nombrePaciente?: string;
  /**
   * Nombre del médico encargado. Si no se pasa, se resuelve desde el equipo
   * quirúrgico que trae la propia nota.
   */
  nombreMedico?: string;
  /** Muestra la casilla para incluir la nota en una descarga en bloque. */
  seleccionable?: boolean;
  seleccionada?: boolean;
  onSeleccionar?: (seleccionada: boolean) => void;
}

export function NotaCard({
  nota,
  mostrarPaciente = true,
  nombrePaciente,
  nombreMedico,
  seleccionable = false,
  seleccionada = false,
  onSeleccionar,
}: NotaCardProps) {
  const navigate = useNavigate();

  // `medicoEncargado` es un UUID: sin resolverlo, el listado mostraba el
  // identificador en crudo. El equipo quirúrgico de la nota trae los nombres,
  // así que sirve de respaldo cuando la pantalla no los pasa.
  const encargado = nota.medicos.find((m) => m.id === nota.medicoEncargado);
  const medico =
    nombreMedico ??
    (encargado ? `${encargado.nombres} ${encargado.apellidos}`.trim() : "");

  const ayudantes = nota.medicos
    .filter((m) => m.id !== nota.medicoEncargado)
    .map((m) => `${m.nombres} ${m.apellidos}`.trim());

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex items-start gap-3 rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => navigate(`/notas/${nota.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") navigate(`/notas/${nota.id}`);
      }}
      aria-label={`Ver nota del ${formatFechaUI(nota.fechaComienzo)}`}
    >
      {seleccionable && (
        <div
          className="flex items-center pt-0.5"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Checkbox
            label=""
            containerClassName="border-0 bg-transparent p-0 hover:bg-transparent has-[:checked]:bg-transparent has-[:checked]:border-0"
            checked={seleccionada}
            onChange={(e) => onSeleccionar?.(e.target.checked)}
            aria-label={`Seleccionar nota del ${formatFechaUI(nota.fechaComienzo)}`}
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          {/* Fecha e insignia — siempre visibles */}
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {formatFechaUI(nota.fechaComienzo)}
            </p>
            {nota.legalizada && (
              <Badge
                variant="secondary"
                className="gap-1 px-2 py-0 text-[10px] font-medium"
                title="Nota legalizada"
              >
                <Stamp className="h-3 w-3" aria-hidden />
                Legalizada
              </Badge>
            )}
          </div>

          {/* Título principal */}
          <p className="truncate text-sm font-medium">
            {mostrarPaciente && nombrePaciente
              ? nombrePaciente
              : nota.intervencionRealizada}
          </p>

          {/* Subtítulo */}
          {mostrarPaciente && (
            <p className="truncate text-sm text-muted-foreground">
              {nota.intervencionRealizada}
            </p>
          )}
        </div>

        {(medico || ayudantes.length > 0) && (
          <div className="flex min-w-0 flex-col gap-0.5 text-xs sm:ml-4 sm:max-w-44 sm:shrink-0 sm:items-end sm:text-right">
            {medico && (
              <span className="truncate">
                <span className="text-muted-foreground">Cirujano: </span>
                {medico}
              </span>
            )}
            {ayudantes.length > 0 && (
              <span className="truncate text-muted-foreground">
                Ayudantes: {ayudantes.join(", ")}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
