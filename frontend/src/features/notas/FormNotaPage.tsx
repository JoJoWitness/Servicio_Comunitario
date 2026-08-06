/**
 * Formulario de creación y edición de notas operatorias.
 * Requisitos: 14.1–14.8, 16.2–16.6, 17.1–17.4, 21.1–21.3, 21.5, 24.1–24.3
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, UserPlus } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutocompleteInput } from "./AutocompleteInput";
import { SelectorPacienteDialog } from "./SelectorPacienteDialog";
import { NotaFormSchema } from "@/domain/validation/nota.validation";
import { BACKEND_SUPPORTS_OJO_ESTADO } from "@/api/dto/nota.dto";
import type { z } from "zod";
type NotaFormValues = z.input<typeof NotaFormSchema>;
import { useCrearNota, useEditarNota, useObtenerNota } from "@/hooks/useNotas";
import { useDiagnosticos, useProcedimientos, useTecnicas } from "@/hooks/useCatalogos";
import { useListarUsuarios } from "@/hooks/useUsuarios";
import { useListarPacientes } from "@/hooks/usePacientes";
import { useSessionStore } from "@/stores/sessionStore";
import { isApiError } from "@/api/errors";
import { derivarEquipoDesdeMedicos } from "@/lib/equipo";
import type { Paciente } from "@/domain/models";

function toDateInputValue(d: Date | undefined): string {
  if (!d) return "";
  return d.toISOString().split("T")[0]!;
}

export default function FormNotaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const perfil = useSessionStore((s) => s.perfil);

  const esEdicion = !!id;
  const notaId = id ? Number(id) : undefined;

  const pacienteDesdeState = (
    location.state as { pacienteSeleccionado?: Paciente } | null
  )?.pacienteSeleccionado;

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(
    pacienteDesdeState ?? null
  );
  const [selectorOpen, setSelectorOpen] = useState(false);

  const { data: diagnosticosData } = useDiagnosticos();
  const { data: procedimientosData } = useProcedimientos();
  const { data: tecnicasData } = useTecnicas();
  // size:100 garantiza que todos los médicos aparezcan en el selector (Req 16.1)
  const { data: usuariosResp, isSuccess: medicosListados } = useListarUsuarios(undefined, { size: 100 });
  const { data: pacientesResp } = useListarPacientes(undefined, { size: 200 });

  const opcionesDx = (diagnosticosData ?? []).map((d) => d.diagnostico);
  const opcionesProc = (procedimientosData ?? []).map((p) => p.intervencion);
  const opcionesTecnica = (tecnicasData ?? []).map((t) => t.tecnica);
  // Sin filtro de rol — el backend devuelve rol vacío ("") temporalmente
  const medicos = usuariosResp?.data ?? [];
  const pacientesData = pacientesResp?.data ?? [];

  const { data: notaExistente } = useObtenerNota(notaId ?? 0);
  const { mutate: crearNota, isPending: creando } = useCrearNota();
  const { mutate: editarNota, isPending: editando } = useEditarNota(notaId ?? 0);
  const isPending = creando || editando;

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<NotaFormValues>({
    resolver: zodResolver(NotaFormSchema),
    defaultValues: {
      medicoEncargado: perfil?.id ?? "",
      equipo: [],
      esElectiva: false,
      esEmergencia: false,
      tuvoBiopsia: false,
    },
  });

  // Preseleccionar médico encargado cuando la lista de médicos carga
  useEffect(() => {
    if (!medicosListados || esEdicion) return;
    const encargadoActual = getValues("medicoEncargado");
    if (!encargadoActual && perfil?.id) {
      setValue("medicoEncargado", perfil.id, { shouldValidate: false });
    }
  }, [medicosListados, esEdicion, perfil?.id, getValues, setValue]);

  // Precarga de nota existente (edición)
  useEffect(() => {
    if (esEdicion && notaExistente) {
      const equipoIds = derivarEquipoDesdeMedicos(notaExistente.medicos).filter(
        (uid) => uid !== notaExistente.medicoEncargado
      );
      reset({
        idPaciente: notaExistente.idPaciente,
        dxPreOperatorio: notaExistente.dxPreOperatorio,
        dxPostOperatorio: notaExistente.dxPostOperatorio ?? "",
        intervencionRealizada: notaExistente.intervencionRealizada,
        resumenIntervencion: notaExistente.resumenIntervencion ?? "",
        fechaComienzo: toDateInputValue(notaExistente.fechaComienzo),
        fechaCulminacion: toDateInputValue(notaExistente.fechaCulminacion),
        horaComienzo: notaExistente.horaComienzo,
        horaCulminacion: notaExistente.horaCulminacion,
        pabellon: notaExistente.pabellon,
        esElectiva: notaExistente.esElectiva,
        esEmergencia: notaExistente.esEmergencia,
        tuvoBiopsia: notaExistente.tuvoBiopsia,
        anestesia: notaExistente.anestesia,
        medicoEncargado: notaExistente.medicoEncargado ?? perfil?.id ?? "",
        equipo: equipoIds,
        tecnica: "",
      });
      const pac = (pacientesData ?? []).find((p) => p.id === notaExistente.idPaciente);
      if (pac) setPacienteSeleccionado(pac);
    }
  }, [esEdicion, notaExistente, reset, perfil?.id, pacientesData]);

  // Sincronizar pacienteSeleccionado con el campo idPaciente del form
  useEffect(() => {
    if (pacienteSeleccionado) {
      setValue("idPaciente", pacienteSeleccionado.id, { shouldValidate: true });
    }
  }, [pacienteSeleccionado, setValue]);

  // Restaurar objeto paciente cuando la lista carga y ya hay un idPaciente en el form
  const watchedIdPaciente = watch("idPaciente");
  useEffect(() => {
    if (pacienteSeleccionado || !watchedIdPaciente || !pacientesData?.length) return;
    const pac = pacientesData.find((p) => p.id === watchedIdPaciente);
    if (pac) setPacienteSeleccionado(pac);
  }, [pacientesData, watchedIdPaciente, pacienteSeleccionado]);

  const onSubmit = useCallback(
    (data: NotaFormValues) => {
      setErrorMsg(null);
      setExito(false);
      const medicoEncargadoId = data.medicoEncargado ?? perfil?.id ?? "";
      const nota = {
        id: notaId,
        dxPreOperatorio: data.dxPreOperatorio,
        dxPostOperatorio: data.dxPostOperatorio ?? "",
        intervencionRealizada: data.intervencionRealizada,
        resumenIntervencion: data.resumenIntervencion ?? "",
        fechaComienzo: new Date(data.fechaComienzo),
        fechaCulminacion: data.fechaCulminacion
          ? new Date(data.fechaCulminacion)
          : new Date(data.fechaComienzo),
        horaComienzo: data.horaComienzo || "00:00",
        horaCulminacion: data.horaCulminacion || "00:00",
        pabellon: data.pabellon ?? "",
        esElectiva: data.esElectiva ?? false,
        esEmergencia: data.esEmergencia ?? false,
        tuvoBiopsia: data.tuvoBiopsia ?? false,
        anestesia: data.anestesia ?? "",
        idPaciente: data.idPaciente,
        medicoEncargado: medicoEncargadoId,
        equipo: data.equipo ?? [],
        medicos: [],
      };
      const onError = (err: unknown) => {
        setErrorMsg(
          isApiError(err) && err.status === 400
            ? err.body || "Error de validación."
            : "Error al guardar la nota. Intenta de nuevo."
        );
      };
      if (esEdicion && notaId) {
        editarNota({ nota, medicoEncargadoId }, {
          onSuccess: () => { setExito(true); navigate(`/notas/${notaId}`); },
          onError,
        });
      } else {
        crearNota({ nota, medicoEncargadoId }, {
          onSuccess: (notaCreada) => {
            setExito(true);
            navigate(`/notas/${notaCreada.id}`);
          },
          onError,
        });
      }
    },
    [esEdicion, notaId, perfil?.id, crearNota, editarNota, navigate]
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-2xl font-semibold">
          {esEdicion ? "Editar nota operatoria" : "Nueva nota operatoria"}
        </h1>

        {exito && (
          <Alert role="status">
            <AlertDescription>Nota guardada correctamente.</AlertDescription>
          </Alert>
        )}
        {errorMsg && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          {/* ── Paciente ── */}
          <Card>
            <CardHeader><CardTitle className="text-base">Paciente *</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {pacienteSeleccionado ? (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{pacienteSeleccionado.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {pacienteSeleccionado.tipoDocumento}-{pacienteSeleccionado.numeroIdentificacion}
                      {" · "}HM: {pacienteSeleccionado.historiaMedica}
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline"
                    onClick={() => setPacienteSeleccionado(null)}>
                    Cambiar
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Busca un paciente o regístralo si no existe.
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline"
                      onClick={() => setSelectorOpen(true)}>
                      Buscar paciente
                    </Button>
                    <Button type="button" size="sm" variant="outline"
                      onClick={() => navigate("/pacientes/nuevo", { state: { origenNota: true } })}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Registrar nuevo
                    </Button>
                  </div>
                  <input type="hidden" {...register("idPaciente")} />
                  {errors.idPaciente && (
                    <p className="text-sm text-destructive">{errors.idPaciente.message}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Diagnósticos ── */}
          <Card>
            <CardHeader><CardTitle className="text-base">Diagnósticos</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="dxPreOperatorio">Dx. preoperatorio *</Label>
                <Controller name="dxPreOperatorio" control={control}
                  render={({ field }) => (
                    <AutocompleteInput id="dxPreOperatorio" value={field.value ?? ""}
                      onChange={field.onChange} opciones={opcionesDx}
                      placeholder="Escribir o seleccionar…"
                      aria-describedby={errors.dxPreOperatorio ? "dxPre-error" : undefined} />
                  )} />
                {errors.dxPreOperatorio && (
                  <p id="dxPre-error" className="text-sm text-destructive">
                    {errors.dxPreOperatorio.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="dxPostOperatorio">Dx. postoperatorio</Label>
                <Controller name="dxPostOperatorio" control={control}
                  render={({ field }) => (
                    <AutocompleteInput id="dxPostOperatorio" value={field.value ?? ""}
                      onChange={field.onChange} opciones={opcionesDx}
                      placeholder="Escribir o seleccionar…" />
                  )} />
              </div>
            </CardContent>
          </Card>

          {/* ── Intervención ── */}
          <Card>
            <CardHeader><CardTitle className="text-base">Intervención</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="intervencionRealizada">Intervención realizada *</Label>
                <Controller name="intervencionRealizada" control={control}
                  render={({ field }) => (
                    <AutocompleteInput id="intervencionRealizada" value={field.value ?? ""}
                      onChange={field.onChange} opciones={opcionesProc}
                      placeholder="Escribir o seleccionar…"
                      aria-describedby={errors.intervencionRealizada ? "iv-error" : undefined} />
                  )} />
                {errors.intervencionRealizada && (
                  <p id="iv-error" className="text-sm text-destructive">
                    {errors.intervencionRealizada.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="tecnica">Técnica</Label>
                <Controller name="tecnica" control={control}
                  render={({ field }) => (
                    <AutocompleteInput id="tecnica" value={field.value ?? ""}
                      onChange={field.onChange} opciones={opcionesTecnica}
                      placeholder="Escribir o seleccionar…" />
                  )} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="resumenIntervencion">Resumen de la intervención</Label>
                <Textarea id="resumenIntervencion" rows={3} {...register("resumenIntervencion")} />
              </div>
            </CardContent>
          </Card>

          {/* ── Fechas y horas ── */}
          <Card>
            <CardHeader><CardTitle className="text-base">Fechas y horas</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="fechaComienzo">Fecha de inicio *</Label>
                <Input id="fechaComienzo" type="date" {...register("fechaComienzo")} />
                {errors.fechaComienzo && (
                  <p className="text-sm text-destructive">{errors.fechaComienzo.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="fechaCulminacion">Fecha de culminación</Label>
                <Input id="fechaCulminacion" type="date" {...register("fechaCulminacion")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="horaComienzo">Hora de inicio</Label>
                <Input id="horaComienzo" type="time" {...register("horaComienzo")} />
                {errors.horaComienzo && (
                  <p className="text-sm text-destructive">{errors.horaComienzo.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="horaCulminacion">Hora de culminación</Label>
                <Input id="horaCulminacion" type="time" {...register("horaCulminacion")} />
                {errors.horaCulminacion && (
                  <p className="text-sm text-destructive">{errors.horaCulminacion.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Datos clínicos ── */}
          <Card>
            <CardHeader><CardTitle className="text-base">Datos clínicos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="pabellon">Pabellón</Label>
                <Input id="pabellon" {...register("pabellon")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="anestesia">Anestesia</Label>
                <Input id="anestesia" {...register("anestesia")} />
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register("esElectiva")} className="h-4 w-4" />
                  Electiva
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register("esEmergencia")} className="h-4 w-4" />
                  Emergencia
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register("tuvoBiopsia")} className="h-4 w-4" />
                  Biopsia
                </label>
              </div>
              {BACKEND_SUPPORTS_OJO_ESTADO && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="ojo">Ojo</Label>
                    <Controller name={"ojo" as keyof NotaFormValues} control={control}
                      render={({ field }) => (
                        <Select value={field.value as string} onValueChange={field.onChange}>
                          <SelectTrigger id="ojo"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OD">OD</SelectItem>
                            <SelectItem value="OI">OI</SelectItem>
                            <SelectItem value="AO">AO</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="estado">Estado</Label>
                    <Controller name={"estado" as keyof NotaFormValues} control={control}
                      render={({ field }) => (
                        <Select value={(field.value as string) ?? "realizada"} onValueChange={field.onChange}>
                          <SelectTrigger id="estado"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realizada">Realizada</SelectItem>
                            <SelectItem value="diferida">Diferida</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Equipo quirúrgico ── */}
          <Card>
            <CardHeader><CardTitle className="text-base">Médico encargado y equipo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="medicoEncargado">Médico encargado</Label>
                <Controller name="medicoEncargado" control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger id="medicoEncargado">
                        <SelectValue placeholder={medicos.length === 0 ? "Cargando médicos…" : "Seleccionar médico…"} />
                      </SelectTrigger>
                      <SelectContent>
                        {medicos.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nombres} {m.apellidos}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
              </div>
              <div className="space-y-2">
                <Label>Equipo quirúrgico</Label>
                <p className="text-xs text-muted-foreground">
                  El médico encargado se agrega automáticamente.
                </p>
                <Controller name="equipo" control={control}
                  render={({ field }) => {
                    const encargadoId = watch("medicoEncargado") ?? "";
                    const participantes = medicos.filter((m) => m.id !== encargadoId);
                    return (
                      <div className="flex flex-wrap gap-2">
                        {participantes.map((m) => {
                          const seleccionado = (field.value ?? []).includes(m.id);
                          return (
                            <button key={m.id} type="button" aria-pressed={seleccionado}
                              onClick={() => {
                                const actual = field.value ?? [];
                                field.onChange(seleccionado
                                  ? actual.filter((uid) => uid !== m.id)
                                  : [...actual, m.id]);
                              }}
                              className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                                seleccionado
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background border-border hover:bg-muted"
                              }`}>
                              {m.nombres} {m.apellidos}
                            </button>
                          );
                        })}
                        {participantes.length === 0 && (
                          <p className="text-sm text-muted-foreground">No hay otros médicos disponibles.</p>
                        )}
                      </div>
                    );
                  }} />
              </div>
            </CardContent>
          </Card>

          <Separator />
          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear nota"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>

      <SelectorPacienteDialog
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={(pac) => {
          setPacienteSeleccionado(pac);
          setSelectorOpen(false);
        }}
      />
    </AppLayout>
  );
}
