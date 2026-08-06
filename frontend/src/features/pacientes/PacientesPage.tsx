/**
 * Listado de pacientes con búsqueda local en tiempo real.
 * Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ControlsPaginacion } from "@/components/ControlsPaginacion";
import { useListarPacientes } from "@/hooks/usePacientes";
import { useServerPaginacion } from "@/hooks/usePaginacion";
import { useSessionStore } from "@/stores/sessionStore";
import { filtrarPacientes } from "@/lib/search";
import { formatFechaUI } from "@/lib/datetime";

export default function PacientesPage() {
  const navigate = useNavigate();
  const [termino, setTermino] = useState("");
  const perfil = useSessionStore((s) => s.perfil);
  const puedeCrear = perfil?.rol !== "secretaria";

  // Paginación server-side
  const paginacion = useServerPaginacion("nombre", "ASC", 10);

  const { data: respuesta, isLoading, isError } = useListarPacientes({
    page: paginacion.pagina,
    size: paginacion.size,
    sortBy: paginacion.sortBy,
    order: paginacion.order,
  });

  // Actualizar metadata cuando llega la respuesta
  useEffect(() => {
    if (respuesta?.meta) paginacion.setMeta(respuesta.meta);
  }, [respuesta?.meta]);

  // Filtro local sobre la página actual (la búsqueda full-text queda pendiente de backend)
  const todos = respuesta?.data ?? [];
  const resultado = filtrarPacientes(todos, termino);
  const sinResultados = termino.trim() !== "" && resultado.length === 0 && todos.length > 0;

  const handleTermino = (v: string) => {
    setTermino(v);
    paginacion.resetear();
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Pacientes</h1>
          {puedeCrear && (
            <Button size="sm" onClick={() => navigate("/pacientes/nuevo")}>
              <UserPlus className="mr-2 h-4 w-4" />
              Nuevo paciente
            </Button>
          )}
        </div>

        {/* Buscador */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, cédula o historia médica…"
            className="pl-9"
            value={termino}
            onChange={(e) => handleTermino(e.target.value)}
            aria-label="Buscar paciente"
          />
        </div>

        {/* Estado de carga */}
        {isLoading && (
          <p className="text-sm text-muted-foreground" role="status">
            Cargando pacientes…
          </p>
        )}

        {/* Error de red */}
        {isError && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>
              No se pudo cargar la lista de pacientes. Verifica la conexión y recarga.
            </AlertDescription>
          </Alert>
        )}

        {/* Sin coincidencias — ofrecer registrar nuevo — Requisito 10.4 */}
        {sinResultados && (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
            <p className="text-sm text-muted-foreground">
              No se encontró ningún paciente que coincida con{" "}
              <span className="font-medium">"{termino}"</span>.
            </p>
            {puedeCrear && (
              <Button
                size="sm"
                onClick={() => navigate("/pacientes/nuevo", { state: { terminoBusqueda: termino } })}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Registrar paciente nuevo
              </Button>
            )}
          </div>
        )}

        {/* Tabla de resultados */}
        {!isLoading && !isError && !sinResultados && resultado.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Historia médica</TableHead>
                  <TableHead>Nacimiento</TableHead>
                  <TableHead>Género</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultado.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/pacientes/${p.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") navigate(`/pacientes/${p.id}`);
                    }}
                    aria-label={`Ver ficha de ${p.nombre}`}
                  >
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell>{p.tipoDocumento}-{p.numeroIdentificacion}</TableCell>
                    <TableCell>{p.historiaMedica}</TableCell>
                    <TableCell>{formatFechaUI(p.fechaNacimiento)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {p.genero === "M" ? "Masculino" : "Femenino"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 pb-3">
              <ControlsPaginacion {...paginacion} />
            </div>
          </div>
        )}

        {/* Estado vacío sin búsqueda */}
        {!isLoading && !isError && resultado.length === 0 && termino.trim() === "" && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">No hay pacientes registrados aún.</p>
            {puedeCrear && (
              <Button size="sm" onClick={() => navigate("/pacientes/nuevo")}>
                <UserPlus className="mr-2 h-4 w-4" />
                Registrar primer paciente
              </Button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
