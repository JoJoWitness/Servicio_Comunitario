/**
 * Seguimiento de biopsias: lo que sigue sin resultado o sin entregar, con
 * filtros y el acceso rápido "más de N días sin resultado".
 * Ruta: /biopsias
 */

import { useEffect, useState } from "react";
import { FilterX, Hourglass } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/ui/date-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ControlsPaginacion } from "@/components/ControlsPaginacion";
import { useBiopsias } from "@/hooks/useBiopsias";
import { useTodosLosUsuarios } from "@/hooks/useUsuarios";
import { useListarPacientes } from "@/hooks/usePacientes";
import { useServerPaginacion } from "@/hooks/usePaginacion";
import { useSessionStore } from "@/stores/sessionStore";
import { aISOLocal } from "@/lib/datetime";
import { ESTADOS_BIOPSIA, type EstadoBiopsia, type FiltrosBiopsia } from "@/domain/models";
import { ETIQUETA_ESTADO } from "./BiopsiaBadge";
import { ListaBiopsias } from "./ListaBiopsias";

const ESTADOS_ABIERTOS: EstadoBiopsia[] = ["tomada", "enviada", "con_resultado"];

export default function BiopsiasPage() {
  const perfil = useSessionStore((s) => s.perfil);

  // El médico arranca viendo las suyas; secretaría y admin, todas.
  const [medico, setMedico] = useState(perfil?.rol === "medico" ? perfil.id : "");
  const [paciente, setPaciente] = useState("");
  const [estados, setEstados] = useState<EstadoBiopsia[]>(ESTADOS_ABIERTOS);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [soloAtrasadas, setSoloAtrasadas] = useState(false);

  const paginacion = useServerPaginacion("fecha_toma", "DESC", 20);
  useEffect(() => { paginacion.resetear(); }, [medico, paciente, estados, from, to, soloAtrasadas]);

  const { data: usuarios } = useTodosLosUsuarios();
  const medicos = (usuarios ?? []).filter((u) => u.rol === "medico");
  const { data: pacientesResp } = useListarPacientes(undefined, { size: 200 });
  const pacientes = pacientesResp?.data ?? [];

  const hace30 = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return aISOLocal(d);
  };

  const filtros: FiltrosBiopsia = {
    medico: medico || undefined,
    paciente: paciente || undefined,
    estados: estados.length === ESTADOS_BIOPSIA.length ? undefined : estados,
    from: from || undefined,
    to: to || undefined,
    sinResultadoDesde: soloAtrasadas ? hace30() : undefined,
  };

  // La vista por defecto del médico se refleja para consultarla sin señal.
  const esVistaPorDefecto =
    medico === (perfil?.rol === "medico" ? perfil.id : "") &&
    !paciente && !from && !to && !soloAtrasadas &&
    estados.length === ESTADOS_ABIERTOS.length &&
    ESTADOS_ABIERTOS.every((e) => estados.includes(e));

  const { data, isLoading, isError } = useBiopsias(
    filtros,
    { page: paginacion.pagina, size: paginacion.size, sortBy: paginacion.sortBy, order: paginacion.order },
    { reflejar: esVistaPorDefecto && paginacion.pagina === 1 }
  );

  useEffect(() => {
    if (data?.meta) paginacion.setMeta(data.meta);
  }, [data?.meta]);

  const alternarEstado = (estado: EstadoBiopsia, marcado: boolean) =>
    setEstados((prev) => (marcado ? [...new Set([...prev, estado])] : prev.filter((e) => e !== estado)));

  const hayFiltros =
    paciente || from || to || soloAtrasadas ||
    estados.length !== ESTADOS_ABIERTOS.length ||
    medico !== (perfil?.rol === "medico" ? perfil.id : "");

  const limpiar = () => {
    setMedico(perfil?.rol === "medico" ? perfil.id : "");
    setPaciente("");
    setEstados(ESTADOS_ABIERTOS);
    setFrom("");
    setTo("");
    setSoloAtrasadas(false);
  };

  const biopsias = data?.data ?? [];

  return (
    <AppLayout>
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Biopsias</h1>
          {data && (
            <p className="text-sm text-muted-foreground" role="status">
              <span className="font-medium text-foreground">{data.sinResultado}</span> sin resultado
              {data.atrasadas > 0 && (
                <>
                  , <span className="font-medium text-amber-600 dark:text-amber-400">{data.atrasadas}</span> con más de {data.diasAtraso} días
                </>
              )}
            </p>
          )}
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label>Médico</Label>
            <Select value={medico} onValueChange={setMedico}>
              <SelectTrigger aria-label="Filtrar por médico"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {medicos.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.nombres} {m.apellidos}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Paciente</Label>
            <Select value={paciente} onValueChange={setPaciente}>
              <SelectTrigger aria-label="Filtrar por paciente"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {pacientes.filter((p) => !p.eliminado).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="b-from">Toma desde</Label>
            <DateInput id="b-from" value={from} onChange={setFrom} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="b-to">Toma hasta</Label>
            <DateInput id="b-to" value={to} onChange={setTo} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Estado:</span>
          {ESTADOS_BIOPSIA.map((estado) => (
            <Checkbox
              key={estado}
              label={ETIQUETA_ESTADO[estado]}
              containerClassName="py-1"
              checked={estados.includes(estado)}
              onChange={(e) => alternarEstado(estado, e.target.checked)}
            />
          ))}
          <Button
            size="sm"
            variant={soloAtrasadas ? "default" : "outline"}
            onClick={() => setSoloAtrasadas((v) => !v)}
            aria-pressed={soloAtrasadas}
          >
            <Hourglass className="mr-2 h-4 w-4" />
            Más de 30 días sin resultado
          </Button>
          {hayFiltros && (
            <Button variant="ghost" size="sm" onClick={limpiar}>
              <FilterX className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
          )}
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground" role="status">Cargando biopsias…</p>
        )}
        {isError && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>No se pudieron cargar las biopsias. Verifica la conexión y recarga.</AlertDescription>
          </Alert>
        )}
        {!isLoading && !isError && biopsias.length === 0 && (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {hayFiltros ? "No hay biopsias con esos filtros." : "No hay biopsias pendientes."}
            </p>
          </div>
        )}
        {biopsias.length > 0 && (
          <ListaBiopsias biopsias={biopsias} diasAtraso={data?.diasAtraso} />
        )}
        <ControlsPaginacion {...paginacion} />
      </div>
    </AppLayout>
  );
}
