/**
 * Ficha del paciente con historial de notas, edición y baja lógica.
 * Requisitos: 12.1–12.7, 13.1–13.4
 */

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PacienteForm, pacienteAFormInput } from "./PacienteForm";
import { useObtenerPaciente, useEditarPaciente, useDarDeBajaPaciente } from "@/hooks/usePacientes";
import { useNotasDePaciente } from "@/hooks/useNotas";
import { useSessionStore } from "@/stores/sessionStore";
import { ordenarNotasDesc } from "@/lib/sort";
import { formatFechaUI } from "@/lib/datetime";
import { isApiError } from "@/api/errors";
import type { PacienteFormInput } from "@/domain/validation/paciente.validation";

export default function FichaPacientePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const perfil = useSessionStore((s) => s.perfil);

  const [modoEdicion, setModoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);
  const [dialogBaja, setDialogBaja] = useState(false);
  const [errorBaja, setErrorBaja] = useState<string | null>(null);

  const {
    data: paciente,
    isLoading: cargandoPaciente,
    isError: errorPaciente,
  } = useObtenerPaciente(id ?? "");

  // Requisito 12.2: GET /notas/pacientes/{id}
  const {
    data: notasRaw,
    isLoading: cargandoNotas,
  } = useNotasDePaciente(id ?? "");

  // Requisito 12.3: historial ordenado de más reciente a más antigua
  const notas = notasRaw ? ordenarNotasDesc(notasRaw) : [];

  const { mutate: editarPaciente, isPending: guardando } = useEditarPaciente(id ?? "");
  const { mutate: darDeBaja, isPending: dandoBaja } = useDarDeBajaPaciente();

  // Roles que pueden editar — Requisito 13.1
  const puedeEditar = perfil?.rol === "medico" || perfil?.rol === "admin";
  // Solo admin puede dar de baja — Requisito 13.3
  const puedeEliminar = perfil?.rol === "admin";

  const handleGuardar = (data: PacienteFormInput) => {
    if (!paciente) return;
    setErrorEdicion(null);

    const actualizado = {
      ...paciente,
      historiaMedica: data.historiaMedica,
      tipoDocumento: data.tipoDocumento,
      numeroIdentificacion: data.numeroIdentificacion,
      nombre: data.nombre,
      genero: data.genero,
      fechaNacimiento: new Date(data.fechaNacimiento),
      telefono: data.telefono,
      direccion: data.direccion,
    };

    editarPaciente(actualizado, {
      onSuccess: () => setModoEdicion(false),
      onError: (err) => {
        setErrorEdicion(
          isApiError(err) ? err.body || "Error al guardar." : "Error inesperado."
        );
      },
    });
  };

  const handleBaja = () => {
    if (!id) return;
    setErrorBaja(null);
    darDeBaja(id, {
      onSuccess: () => navigate("/pacientes"),
      onError: (err) => {
        setErrorBaja(
          isApiError(err) ? err.body || "Error al dar de baja." : "Error inesperado."
        );
      },
    });
  };

  // ── Error al cargar paciente — Requisito 12.6 (backend usa 500, no 404)
  if (errorPaciente) {
    return (
      <AppLayout>
        <div className="p-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Alert variant="destructive" role="alert">
            <AlertDescription>Paciente no encontrado o no disponible.</AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  if (cargandoPaciente || !paciente) {
    return (
      <AppLayout>
        <div className="p-6">
          <p className="text-sm text-muted-foreground" role="status">Cargando ficha…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div className="flex gap-2">
            {puedeEditar && !modoEdicion && (
              <Button size="sm" variant="outline" onClick={() => setModoEdicion(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
            {/* Requisito 13.4: ocultar baja para médico y secretaria */}
            {puedeEliminar && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDialogBaja(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Dar de baja
              </Button>
            )}
          </div>
        </div>

        {/* Datos del paciente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{paciente.nombre}</CardTitle>
          </CardHeader>
          <CardContent>
            {modoEdicion ? (
              /* Modo edición — Requisito 13.1 */
              <PacienteForm
                valorInicial={pacienteAFormInput(paciente)}
                onSubmit={handleGuardar}
                isPending={guardando}
                errorMsg={errorEdicion}
                submitLabel="Guardar cambios"
              />
            ) : (
              /* Modo lectura */
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Historia médica</dt>
                  <dd className="font-medium">{paciente.historiaMedica}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Documento</dt>
                  <dd>{paciente.tipoDocumento}-{paciente.numeroIdentificacion}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Género</dt>
                  <dd>
                    <Badge variant="secondary">
                      {paciente.genero === "M" ? "Masculino" : "Femenino"}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fecha de nacimiento</dt>
                  <dd>{formatFechaUI(paciente.fechaNacimiento)}</dd>
                </div>
                {paciente.telefono && (
                  <div>
                    <dt className="text-muted-foreground">Teléfono</dt>
                    <dd>{paciente.telefono}</dd>
                  </div>
                )}
                {paciente.direccion && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Dirección</dt>
                    <dd>{paciente.direccion}</dd>
                  </div>
                )}
              </dl>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Historial de notas */}
        <section aria-labelledby="historial-heading">
          <h2 id="historial-heading" className="text-lg font-semibold mb-3">
            Historial de notas operatorias
          </h2>

          {cargandoNotas && (
            <p className="text-sm text-muted-foreground" role="status">Cargando historial…</p>
          )}

          {/* Requisito 12.7: estado vacío, no error */}
          {!cargandoNotas && notas.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Este paciente no tiene notas operatorias registradas.
            </p>
          )}

          {notas.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Requisito 12.4 */}
                    <TableHead>Fecha</TableHead>
                    <TableHead>Intervención</TableHead>
                    <TableHead>Médico encargado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notas.map((nota) => (
                    <TableRow
                      key={nota.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/notas/${nota.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          navigate(`/notas/${nota.id}`);
                      }}
                    >
                      <TableCell>{formatFechaUI(nota.fechaComienzo)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {nota.intervencionRealizada}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {nota.medicoEncargado ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>

      {/* Diálogo de baja — Requisito 13.3 */}
      <Dialog open={dialogBaja} onOpenChange={setDialogBaja}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Dar de baja a este paciente?</DialogTitle>
            <DialogDescription>
              El paciente {paciente.nombre} quedará marcado como inactivo y no aparecerá
              en los listados. Esta acción puede revertirse desde la administración.
            </DialogDescription>
          </DialogHeader>
          {errorBaja && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{errorBaja}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogBaja(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleBaja} disabled={dandoBaja}>
              {dandoBaja ? "Dando de baja..." : "Confirmar baja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
