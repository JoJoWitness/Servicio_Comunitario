/**
 * Dialog de búsqueda y selección de paciente dentro del formulario de nota.
 * No navega — ejecuta el callback onSelect con el paciente elegido.
 */

import { useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ControlsPaginacion } from "@/components/ControlsPaginacion";
import { useListarPacientes } from "@/hooks/usePacientes";
import { usePaginacion } from "@/hooks/usePaginacion";
import { filtrarPacientes } from "@/lib/search";
import { formatFechaUI } from "@/lib/datetime";
import type { Paciente } from "@/domain/models";

interface SelectorPacienteDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (paciente: Paciente) => void;
}

export function SelectorPacienteDialog({
  open,
  onClose,
  onSelect,
}: SelectorPacienteDialogProps) {
  const navigate = useNavigate();
  const [termino, setTermino] = useState("");
  // size:200 para que el selector muestre todos los pacientes sin paginar el modal
  const { data: respuesta, isLoading, isError } = useListarPacientes({ size: 200 });

  const resultado = filtrarPacientes(respuesta?.data ?? [], termino);
  const sinResultados = termino.trim() !== "" && resultado.length === 0;

  const paginacion = usePaginacion(resultado, 10);

  const handleTermino = (v: string) => {
    setTermino(v);
    paginacion.resetear();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Buscar paciente</DialogTitle>
        </DialogHeader>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Nombre, cédula o historia médica…"
            className="pl-9"
            value={termino}
            onChange={(e) => handleTermino(e.target.value)}
          />
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading && (
            <p className="text-sm text-muted-foreground p-4" role="status">
              Cargando pacientes…
            </p>
          )}

          {isError && (
            <Alert variant="destructive" className="m-2">
              <AlertDescription>No se pudo cargar la lista.</AlertDescription>
            </Alert>
          )}

          {sinResultados && (
            <div className="flex flex-col items-start gap-3 p-4 rounded-lg border border-dashed m-2">
              <p className="text-sm text-muted-foreground">
                No se encontró ningún paciente con{" "}
                <span className="font-medium">"{termino}"</span>.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  navigate("/pacientes/nuevo", {
                    state: { origenNota: true, terminoBusqueda: termino },
                  });
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Registrar paciente nuevo
              </Button>
            </div>
          )}

          {!isLoading && !isError && resultado.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Historia médica</TableHead>
                  <TableHead>Nacimiento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginacion.itemsPagina.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => { onSelect(p); onClose(); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { onSelect(p); onClose(); }
                    }}
                    aria-label={`Seleccionar ${p.nombre}`}
                  >
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell>{p.tipoDocumento}-{p.numeroIdentificacion}</TableCell>
                    <TableCell>{p.historiaMedica}</TableCell>
                    <TableCell>{formatFechaUI(p.fechaNacimiento)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && !isError && resultado.length > 0 && (
            <div className="px-2 pb-2">
              <ControlsPaginacion {...paginacion} />
            </div>
          )}

          {!isLoading && !isError && resultado.length === 0 && !sinResultados && (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <p className="text-sm text-muted-foreground">No hay pacientes registrados.</p>
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  navigate("/pacientes/nuevo", { state: { origenNota: true } });
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Registrar primer paciente
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
