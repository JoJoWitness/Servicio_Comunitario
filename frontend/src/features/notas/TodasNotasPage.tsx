/**
 * Listado global de notas — para secretaria (solo lectura) y admin.
 * Requisitos: 19.1, 19.2, 19.3, 19.4
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilePlus, FilterX } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ControlsPaginacion } from "@/components/ControlsPaginacion";
import { NotaCard } from "./NotaCard";
import { useTodasLasNotas } from "@/hooks/useNotas";
import { useListarUsuarios } from "@/hooks/useUsuarios";
import { useListarPacientes } from "@/hooks/usePacientes";
import { useServerPaginacion } from "@/hooks/usePaginacion";
import { useSessionStore } from "@/stores/sessionStore";
import { ordenarNotasDesc } from "@/lib/sort";
import type { FiltrosNota } from "@/domain/models";

export default function TodasNotasPage() {
  const navigate = useNavigate();
  const perfil = useSessionStore((s) => s.perfil);

  // Filtros — Req 19.2
  const [medicoFiltro, setMedicoFiltro] = useState("");
  const [pacienteFiltro, setPacienteFiltro] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtros: FiltrosNota = {
    medico: medicoFiltro || undefined,
    paciente: pacienteFiltro || undefined,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to).toISOString() : undefined,
  };

  // Requisito 19.1: GET /notas — con paginación server-side
  const paginacion = useServerPaginacion("fecha_comienzo", "DESC", 10);

  // Al cambiar cualquier filtro, volver a página 1
  useEffect(() => { paginacion.resetear(); }, [medicoFiltro, pacienteFiltro, from, to]);

  const { data: notasResp, isLoading, isError } = useTodasLasNotas(filtros, {
    page: paginacion.pagina,
    size: paginacion.size,
    sortBy: paginacion.sortBy,
    order: paginacion.order,
  });

  // Actualizar metadata cuando llega la respuesta
  useEffect(() => {
    if (notasResp?.meta) paginacion.setMeta(notasResp.meta);
  }, [notasResp?.meta]);

  // Pedir lista completa de usuarios y pacientes para los selectores de filtro
  const { data: usuariosResp } = useListarUsuarios(undefined, { size: 100 });
  const { data: pacientesResp } = useListarPacientes(undefined, { size: 200 });

  const notas = notasResp?.data ? ordenarNotasDesc(notasResp.data) : [];
  const medicos = usuariosResp?.data ?? [];
  const pacientesLista = pacientesResp?.data ?? [];

  const getPaciente = (idPaciente: string) =>
    pacientesLista.find((p) => p.id === idPaciente);

  // La secretaria necesita saber quién operó cada caso, y la nota solo trae el
  // UUID del encargado: se resuelve contra la lista de usuarios que ya se pide
  // para el filtro, sin peticiones extra.
  const getNombreMedico = (idMedico?: string) => {
    if (!idMedico) return undefined;
    const m = medicos.find((u) => u.id === idMedico);
    return m ? `${m.nombres} ${m.apellidos}`.trim() : undefined;
  };

  // Requisito 19.3: secretaria → solo lectura (sin botón de crear)
  const puedeCrear = perfil?.rol === "admin" || perfil?.rol === "medico";

  const limpiarFiltros = () => {
    setMedicoFiltro("");
    setPacienteFiltro("");
    setFrom("");
    setTo("");
  };

  const hayFiltros = medicoFiltro || pacienteFiltro || from || to;

  return (
    <AppLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Todas las notas</h1>
          {puedeCrear && (
            <Button size="sm" onClick={() => navigate("/notas/nuevo")}>
              <FilePlus className="mr-2 h-4 w-4" />
              Nueva nota
            </Button>
          )}
        </div>

        {/* Panel de filtros */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label>Médico</Label>
            <Select value={medicoFiltro} onValueChange={setMedicoFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {medicos.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nombres} {m.apellidos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Paciente</Label>
            <Select value={pacienteFiltro} onValueChange={setPacienteFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {pacientesLista
                  .filter((p) => !p.eliminado)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="from-todas">Desde</Label>
            <DateInput
              id="from-todas"
              value={from}
              onChange={setFrom}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to-todas">Hasta</Label>
            <DateInput
              id="to-todas"
              value={to}
              onChange={setTo}
            />
          </div>
        </div>

        {hayFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
            <FilterX className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        )}

        {isLoading && (
          <p className="text-sm text-muted-foreground" role="status">
            Cargando notas…
          </p>
        )}

        {isError && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>
              No se pudieron cargar las notas. Verifica la conexión y recarga.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !isError && notas.length === 0 && (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {hayFiltros ? "No hay notas con esos filtros." : "No hay notas registradas."}
            </p>
          </div>
        )}

        {/* Requisito 19.4: navegar al detalle al seleccionar */}
        <div className="space-y-2">
          {notas.map((nota) => {
            const paciente = getPaciente(nota.idPaciente);
            return (
              <NotaCard
                key={nota.id}
                nota={nota}
                mostrarPaciente
                nombrePaciente={paciente?.nombre}
                nombreMedico={getNombreMedico(nota.medicoEncargado)}
              />
            );
          })}
        </div>
        <ControlsPaginacion {...paginacion} />
      </div>
    </AppLayout>
  );
}

