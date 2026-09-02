/**
 * Lista de biopsias: tabla desde `md`, tarjetas por debajo (`<Table responsive>`).
 * Los días sin resultado se pintan en ámbar pasados 30 y en rojo pasados 60.
 */

import { useNavigate } from "react-router-dom";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { diasTranscurridos, formatFechaUI } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { Biopsia } from "@/domain/models";
import { BiopsiaBadge } from "./BiopsiaBadge";

interface ListaBiopsiasProps {
  biopsias: Biopsia[];
  mostrarPaciente?: boolean;
  /** Umbral de atraso en días (lo manda el servidor; 30 por defecto). */
  diasAtraso?: number;
}

export function diasSinResultado(b: Biopsia): number | null {
  if (b.estado === "con_resultado" || b.estado === "entregada") return null;
  return diasTranscurridos(b.fechaEnvio ?? b.fechaToma);
}

export function ListaBiopsias({
  biopsias,
  mostrarPaciente = true,
  diasAtraso = 30,
}: ListaBiopsiasProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-md border max-md:border-0">
      <Table responsive>
        <TableHeader>
          <TableRow>
            <TableHead>Toma</TableHead>
            {mostrarPaciente && <TableHead>Paciente</TableHead>}
            <TableHead>Tejido</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>N.° patología</TableHead>
            <TableHead>Días</TableHead>
            <TableHead>Responsable</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {biopsias.map((b) => {
            const dias = diasSinResultado(b);
            const responsable = b.medicoResponsable
              ? `${b.medicoResponsable.nombres} ${b.medicoResponsable.apellidos}`.trim()
              : "—";
            return (
              <TableRow
                key={b.id}
                className="cursor-pointer hover:bg-muted/50"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/biopsias/${b.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") navigate(`/biopsias/${b.id}`);
                }}
                aria-label={`Ver biopsia de ${b.tejido}`}
              >
                <TableCell data-label="Toma">{formatFechaUI(b.fechaToma)}</TableCell>
                {mostrarPaciente && (
                  <TableCell data-label="Paciente" className="font-medium">
                    {b.pacienteNombre ?? "—"}
                  </TableCell>
                )}
                <TableCell data-label="Tejido">
                  {b.tejido}
                  {b.ojo && <span className="text-muted-foreground"> · {b.ojo}</span>}
                </TableCell>
                <TableCell data-label="Estado">
                  <BiopsiaBadge estado={b.estado} />
                </TableCell>
                <TableCell data-label="N.° patología" className="text-sm text-muted-foreground">
                  {b.numeroPatologia ?? "—"}
                </TableCell>
                <TableCell data-label="Días sin resultado">
                  {dias === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span
                      className={cn(
                        "font-medium",
                        dias > diasAtraso * 2
                          ? "text-destructive"
                          : dias > diasAtraso
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                      )}
                      title={`${dias} días sin resultado`}
                    >
                      {dias}
                    </span>
                  )}
                </TableCell>
                <TableCell data-label="Responsable" className="text-sm text-muted-foreground">
                  {responsable}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
