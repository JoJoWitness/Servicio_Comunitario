/**
 * Vista de detalle de una nota operatoria.
 *
 * - Solo lectura por defecto (Req 20.3)
 * - Edición y eliminación condicionadas por rol, plazo y legalización: el
 *   veredicto viene calculado del servidor (`puedeEditar`) y se muestra antes
 *   de hacer clic (v0.4.0); el 403 queda como red de seguridad
 * - Manejo de 403 (plazo vencido / no participante) — Req 21.4, 22, 23.4
 * - Confirmación de eliminación — Req 23.1
 *
 * Requisitos: 20.1–20.4, 21.1, 21.4, 22.1–22.3, 23.1–23.4
 */

import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logoServicio from "@/assets/logo-servicio.svg";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useObtenerNota, useEliminarNota } from "@/hooks/useNotas";
import { useObtenerPaciente } from "@/hooks/usePacientes";
import { useSessionStore } from "@/stores/sessionStore";
import { useUIStore } from "@/stores/uiStore";
import { clasificar403Nota, isApiError } from "@/api/errors";
import { formatFechaUI } from "@/lib/datetime";
import { resumenConObservaciones } from "@/lib/resumen";
import { BotonPDF } from "@/features/pdf/BotonPDF";
import { EstadoNota, motivoBloqueo } from "@/components/EstadoNota";
import { TarjetaBiopsiasNota } from "@/features/biopsias/TarjetaBiopsiasNota";

// ---------------------------------------------------------------------------
// Helpers de display
// ---------------------------------------------------------------------------

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{valor}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function DetalleNotaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notaId = Number(id);

  const perfil = useSessionStore((s) => s.perfil);
  const deshabilitarAccionesNota = useUIStore((s) => s.deshabilitarAccionesNota);
  const accionesDeshabilitadas = useUIStore((s) => s.accionesDeshabilitadas);

  const [dialogEliminar, setDialogEliminar] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
  const [mensajePlazo, setMensajePlazo] = useState<string | null>(null);

  const {
    data: nota,
    isLoading,
    isError,
    error,
  } = useObtenerNota(notaId);

  const { data: paciente } = useObtenerPaciente(nota?.idPaciente ?? "");
  const { mutate: eliminarNota, isPending: eliminando } = useEliminarNota();

  // Rol y permisos. El rol decide si se ven los botones; `puedeEditar` (que
  // calcula el servidor: plazo, legalización, participación) si están activos.
  const rolEscritura = perfil?.rol === "medico" || perfil?.rol === "admin";
  const accDesha = accionesDeshabilitadas(notaId);

  // ── Error 404 — Req 20.4
  const esNoEncontrado =
    isError && isApiError(error) && error.status === 404;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <p className="text-sm text-muted-foreground" role="status">Cargando nota…</p>
        </div>
      </AppLayout>
    );
  }

  if (esNoEncontrado || (isError && !nota)) {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Alert variant="destructive" role="alert">
            <AlertDescription>
              La nota no existe o fue eliminada.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  if (!nota) return null;

  const bloqueo = accDesha
    ? "El plazo para modificar esta nota ha expirado."
    : motivoBloqueo(nota);
  const puedeModificar = rolEscritura && bloqueo === null;

  // El relato y los comentarios se guardan aparte, pero se leen como un solo
  // texto: los comentarios cierran el resumen tras "Observaciones:".
  const resumen = resumenConObservaciones(
    nota.resumenIntervencion,
    nota.comentarios
  );

  // ── Eliminación con manejo de 403 — Req 23.2, 23.4
  const handleEliminar = () => {
    setErrorEliminar(null);
    eliminarNota(notaId, {
      onSuccess: () => {
        setDialogEliminar(false);
        navigate(-1);
      },
      onError: (err) => {
        setDialogEliminar(false);
        if (isApiError(err) && err.status === 403) {
          const motivo = clasificar403Nota(err.body, err.motivo);
          if (motivo === "legalizada") {
            setErrorEliminar(
              "La nota está legalizada. Desactiva la legalización para eliminarla."
            );
          } else if (motivo === "fuera_de_plazo") {
            // Req 22.2: deshabilitar acciones
            deshabilitarAccionesNota(notaId);
            // Req 22.3: mensaje explicativo
            setMensajePlazo(
              "El plazo para modificar esta nota ha expirado."
            );
          } else if (motivo === "no_participante") {
            setErrorEliminar(
              "No puedes eliminar esta nota porque no participaste en la intervención."
            );
          } else {
            setErrorEliminar(err.body || "No se pudo eliminar la nota.");
          }
        } else {
          setErrorEliminar("Error al eliminar la nota. Intenta de nuevo.");
        }
      },
    });
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          {rolEscritura && (
            <div className="flex flex-wrap gap-2">
              <BotonPDF notaId={notaId} pacienteId={nota.idPaciente} />
              <Button
                size="sm"
                variant="outline"
                disabled={!puedeModificar}
                onClick={() => navigate(`/notas/${notaId}/editar`)}
                title={bloqueo ?? "Editar nota"}
                aria-label="Editar nota"
              >
                <Pencil className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={!puedeModificar}
                onClick={() => setDialogEliminar(true)}
                title={bloqueo ?? "Eliminar nota"}
                aria-label="Eliminar nota"
              >
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Eliminar</span>
              </Button>
            </div>
          )}
        </div>

        {/*
          Cabecera con la identidad de la hoja impresa, para que la nota en
          pantalla se reconozca como el mismo documento que se archiva en papel.
        */}
        <div className="flex flex-col items-center gap-3 border-b border-border pb-4">
          <img
            src={logoServicio}
            alt="Servicio de Oftalmología — Hospital Central de San Cristóbal"
            className="h-16 w-auto dark:brightness-0 dark:invert sm:h-24"
          />
          <h1 className="text-xl font-bold tracking-wide">NOTA OPERATORIA</h1>
        </div>

        {/* Legalización y plazo de edición (v0.4.0) */}
        <EstadoNota nota={nota} />

        {/* Mensajes de estado */}
        {mensajePlazo && (
          <Alert role="alert">
            <AlertDescription>{mensajePlazo}</AlertDescription>
          </Alert>
        )}
        {errorEliminar && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{errorEliminar}</AlertDescription>
          </Alert>
        )}

        {/* Datos del paciente */}
        {paciente && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paciente</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                <Campo label="Nombre" valor={paciente.nombre} />
                <Campo
                  label="Documento"
                  valor={`${paciente.tipoDocumento}-${paciente.numeroIdentificacion}`}
                />
                <Campo label="Historia médica" valor={paciente.historiaMedica} />
                <Campo label="Nacimiento" valor={formatFechaUI(paciente.fechaNacimiento)} />
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Datos de la nota — Req 20.2 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nota operatoria</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-y-3 sm:grid-cols-2 sm:gap-x-6">
              <Campo
                label="Fecha de comienzo"
                valor={formatFechaUI(nota.fechaComienzo)}
              />
              <Campo
                label="Fecha de culminación"
                valor={formatFechaUI(nota.fechaCulminacion)}
              />
              <Campo label="Hora inicio" valor={nota.horaComienzo} />
              <Campo label="Hora culminación" valor={nota.horaCulminacion} />
              <Campo label="Anestesia" valor={nota.anestesia} />

              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Dx. preoperatorio</dt>
                <dd className="text-sm">{nota.dxPreOperatorio}</dd>
              </div>
              {nota.dxPostOperatorio && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Dx. postoperatorio</dt>
                  <dd className="text-sm">{nota.dxPostOperatorio}</dd>
                </div>
              )}
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Intervención realizada</dt>
                <dd className="text-sm">{nota.intervencionRealizada}</dd>
              </div>
              {/* Los comentarios cierran el relato, no van en un campo aparte. */}
              {resumen && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Resumen</dt>
                  <dd className="text-sm whitespace-pre-wrap">{resumen}</dd>
                </div>
              )}

              <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
                {nota.esElectiva && (
                  <Badge variant="secondary">Electiva</Badge>
                )}
                {nota.esEmergencia && (
                  <Badge variant="destructive">Emergencia</Badge>
                )}
                {nota.tuvoBiopsia && (
                  <Badge variant="outline">Biopsia</Badge>
                )}
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Equipo quirúrgico — Req 20.2 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Equipo quirúrgico</CardTitle>
          </CardHeader>
          <CardContent>
            {nota.medicos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin equipo registrado.</p>
            ) : (
              <ul className="space-y-1">
                {nota.medicos.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <span className="font-medium">
                      {m.nombres} {m.apellidos}
                    </span>
                    {m.id === nota.medicoEncargado && (
                      <Badge variant="secondary" className="text-xs">
                        Encargado
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Biopsias vinculadas (PRD 0.5.0): su trámite sigue aunque la nota
            esté cerrada o legalizada. */}
        <TarjetaBiopsiasNota nota={nota} />
      </div>

      {/* Diálogo de confirmación de eliminación — Req 23.1 */}
      <Dialog open={dialogEliminar} onOpenChange={setDialogEliminar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar esta nota?</DialogTitle>
            <DialogDescription>
              Se eliminará permanentemente la nota del{" "}
              {formatFechaUI(nota.fechaComienzo)}. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEliminar(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleEliminar} disabled={eliminando}>
              {eliminando ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
