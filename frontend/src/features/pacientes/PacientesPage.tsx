/**
 * Listado de pacientes con filtros estructurados server-side.
 * Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, FilterX } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useDebounce } from "@/hooks/useDebounce";
import { useSessionStore } from "@/stores/sessionStore";
import { formatFechaUI } from "@/lib/datetime";

export default function PacientesPage() {
  const navigate = useNavigate();
  const perfil = useSessionStore((s) => s.perfil);
  const puedeCrear = perfil?.rol !== "secretaria";

  // --- Estado de filtros (inputs inmediatos) ---
  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [historiaMedica, setHistoriaMedica] = useState("");
  const [genero, setGenero] = useState("");

  // Debounce de 500ms para inputs de texto libre
  const nombreDebounced = useDebounce(nombre, 500);
  const documentoDebounced = useDebounce(documento, 500);
  const historiaMedicaDebounced = useDebounce(historiaMedica, 500);

  // Paginación server-side
  const paginacion = useServerPaginacion("nombre", "ASC", 10);

  // Al cambiar cualquier filtro debounced o genero, volver a página 1
  useEffect(() => { paginacion.resetear(); }, [nombreDebounced, documentoDebounced, historiaMedicaDebounced, genero]);

  const filtros = {
    nombre: nombreDebounced || undefined,
    documento: documentoDebounced || undefined,
    historia_medica: historiaMedicaDebounced || undefined,
    genero: genero || undefined,
  };

  const { data: respuesta, isLoading, isError } = useListarPacientes(filtros, {
    page: paginacion.pagina,
    size: paginacion.size,
    sortBy: paginacion.sortBy,
    order: paginacion.order,
  });

  useEffect(() => {
    if (respuesta?.meta) paginacion.setMeta(respuesta.meta);
  }, [respuesta?.meta]);

  const pacientes = respuesta?.data ?? [];

  const hayFiltros = nombre || documento || historiaMedica || genero;

  const limpiarFiltros = () => {
    setNombre("");
    setDocumento("");
    setHistoriaMedica("");
    setGenero("");
  };

  const sinResultados = !isLoading && !isError && pacientes.length === 0;

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

        {/* Panel de filtros estructurados */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="f-nombre">Nombre</Label>
            <Input
              id="f-nombre"
              placeholder="Buscar por nombre…"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              aria-label="Filtrar por nombre"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-documento">Documento</Label>
            <Input
              id="f-documento"
              placeholder="Cédula o pasaporte…"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              aria-label="Filtrar por documento"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-historia">Historia médica</Label>
            <Input
              id="f-historia"
              placeholder="Nro. de historia…"
              value={historiaMedica}
              onChange={(e) => setHistoriaMedica(e.target.value)}
              aria-label="Filtrar por historia médica"
            />
          </div>
          <div className="space-y-1">
            <Label>Género</Label>
            <Select value={genero} onValueChange={setGenero}>
              <SelectTrigger aria-label="Filtrar por género">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Femenino</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hayFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
            <FilterX className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        )}

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

        {/* Sin resultados con filtros activos — ofrecer registrar nuevo — Requisito 10.4 */}
        {sinResultados && hayFiltros && (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
            <p className="text-sm text-muted-foreground">
              No se encontró ningún paciente con esos filtros.
            </p>
            {puedeCrear && (
              <Button
                size="sm"
                onClick={() => navigate("/pacientes/nuevo")}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Registrar paciente nuevo
              </Button>
            )}
          </div>
        )}

        {/* Tabla de resultados */}
        {!isLoading && !isError && pacientes.length > 0 && (
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
                {pacientes.map((p) => (
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

        {/* Estado vacío sin filtros */}
        {sinResultados && !hayFiltros && (
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
