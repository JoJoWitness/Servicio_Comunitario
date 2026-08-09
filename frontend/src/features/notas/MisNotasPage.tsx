/**
 * Listado "Mis Notas" — visible solo para el rol médico.
 * Requisitos: 18.1, 18.2, 18.3, 18.4
 */

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CloudOff, FilePlus } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NotaCard } from "./NotaCard";
import { BarraDescargaNotas } from "./BarraDescargaNotas";
import { useDescargaMultiple } from "./useDescargaMultiple";
import { ExportarRecord } from "./ExportarRecord";
import { NotasPendientes } from "@/offline/NotasPendientes";
import { useMisNotas } from "@/hooks/useNotas";
import { useTodosLosPacientes } from "@/hooks/usePacientes";
import { ordenarNotasDesc } from "@/lib/sort";
import type { RangoFechas } from "@/domain/models";

export default function MisNotasPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const reciénEncolada = Boolean(
    (location.state as { notaEncolada?: boolean } | null)?.notaEncolada
  );

  const rango: RangoFechas | undefined =
    from || to
      ? {
          from: from ? new Date(from).toISOString() : undefined,
          to: to ? new Date(to).toISOString() : undefined,
        }
      : undefined;

  // Requisito 18.1: GET /notas/medics — Req 18.4: con rango GET /notas/medics/dates
  const { data: notasRaw, isLoading, isError } = useMisNotas(rango);
  const { data: pacientes } = useTodosLosPacientes();

  // Requisito 18.2: ordenar de más reciente a más antigua
  const notas = notasRaw ? ordenarNotasDesc(notasRaw) : [];

  const descarga = useDescargaMultiple(notas);

  const getPaciente = (idPaciente: string) =>
    (pacientes ?? []).find((p) => p.id === idPaciente);

  return (
    <AppLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Mis notas</h1>
          <Button size="sm" onClick={() => navigate("/notas/nuevo")}>
            <FilePlus className="mr-2 h-4 w-4" />
            Nueva nota
          </Button>
        </div>

        {/* Confirmación de que la nota quedó guardada aquí y no en el servidor.
            Llega como estado de navegación desde el formulario. */}
        {reciénEncolada && (
          <Alert role="status" className="border-amber-500/50">
            <CloudOff className="h-4 w-4" />
            <AlertDescription>
              La nota se guardó en este equipo porque no hay conexión. Se subirá
              sola en cuanto vuelva la red; también puedes forzarlo desde
              «Sincronizar ahora», en la barra lateral.
            </AlertDescription>
          </Alert>
        )}

        <NotasPendientes resolverPaciente={(id) => getPaciente(id)?.nombre} />

        <ExportarRecord />

        {/* Filtro por rango de fechas — Req 18.4 */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <Label htmlFor="from">Desde</Label>
            <DateInput
              id="from"
              value={from}
              onChange={setFrom}
              className="w-44"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">Hasta</Label>
            <DateInput
              id="to"
              value={to}
              onChange={setTo}
              className="w-44"
            />
          </div>
          {(from || to) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFrom(""); setTo(""); }}
            >
              Limpiar filtro
            </Button>
          )}
        </div>

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
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {rango ? "No hay notas en ese rango de fechas." : "No has registrado notas aún."}
            </p>
            {!rango && (
              <Button size="sm" onClick={() => navigate("/notas/nuevo")}>
                <FilePlus className="mr-2 h-4 w-4" />
                Crear primera nota
              </Button>
            )}
          </div>
        )}

        {notas.length > 0 && (
          <BarraDescargaNotas
            cantidadSeleccionada={descarga.seleccionadas.length}
            todasMarcadas={descarga.todasMarcadas}
            onMarcarTodas={descarga.marcarTodas}
            onDescargar={descarga.descargar}
            generando={descarga.generando}
            error={descarga.error}
          />
        )}

        {/* Requisito 18.3: fecha, paciente, intervención, pabellón */}
        <div className="space-y-2">
          {notas.map((nota) => {
            const paciente = getPaciente(nota.idPaciente);
            return (
              <NotaCard
                key={nota.id}
                nota={nota}
                mostrarPaciente
                nombrePaciente={paciente?.nombre}
                seleccionable
                seleccionada={descarga.estaSeleccionada(nota.id)}
                onSeleccionar={(marcada) =>
                  nota.id !== undefined && descarga.alternar(nota.id, marcada)
                }
              />
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
