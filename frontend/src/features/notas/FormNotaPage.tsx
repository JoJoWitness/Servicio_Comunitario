/**
 * Formulario de creación y edición de notas operatorias.
 * Requisitos: 14.1–14.8, 16.2–16.6, 17.1–17.4, 21.1–21.3, 21.5, 24.1–24.3
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CloudOff, Lock, Plus, RotateCcw, UserPlus } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup } from "@/components/ui/radio-group";
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
import { CampoDiagnostico } from "./CampoDiagnostico";
import { SelectorPacienteDialog } from "./SelectorPacienteDialog";
import { CedulaPaciente } from "@/features/pacientes/CedulaPaciente";
import { motivoBloqueo } from "@/components/EstadoNota";
import { useCrearBiopsia } from "@/hooks/useBiopsias";
// import { TEJIDOS_BIOPSIA } from "@/features/biopsias/tejidos"; // bloque de biopsia comentado
import type { Biopsia } from "@/domain/models";
import { SIN_DESCRIPTORES } from "@/features/biopsias/descriptoresForm";
import {
  NotaFormSchema,
  normalizarAnestesia,
} from "@/domain/validation/nota.validation";
import { BACKEND_SUPPORTS_OJO_ESTADO } from "@/api/dto/nota.dto";
import type { z } from "zod";
type NotaFormValues = z.input<typeof NotaFormSchema>;
import { useCrearNota, useEditarNota, useObtenerNota } from "@/hooks/useNotas";
import {
  useGuardarNotaPendiente,
  usePendienteNota,
} from "@/offline/useSincronizacion";
import { useDiagnosticos, useProcedimientos, useTecnicas } from "@/hooks/useCatalogos";
import { useTodosLosUsuarios } from "@/hooks/useUsuarios";
import { useTodosLosPacientes } from "@/hooks/usePacientes";
import { useSessionStore } from "@/stores/sessionStore";
import { isApiError } from "@/api/errors";
import { derivarEquipoDesdeMedicos } from "@/lib/equipo";
import {
  ENCABEZADO_OBSERVACIONES,
  aplicarHuecos,
  insertarFrase,
  valoresPorDefecto,
} from "@/lib/resumen";
import type { Paciente } from "@/domain/models";

function toDateInputValue(d: Date | undefined): string {
  if (!d) return "";
  return d.toISOString().split("T")[0]!;
}

export default function FormNotaPage() {
  const { id, clientUuid } = useParams<{ id: string; clientUuid: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const perfil = useSessionStore((s) => s.perfil);

  // Tres modos, no dos: crear, editar una nota del servidor, y corregir una
  // que todavía está en la cola de este equipo. La tercera no tiene id
  // numérico —no existe fuera de aquí— y se guarda de vuelta en la cola, no
  // contra la API.
  const esPendiente = !!clientUuid;
  const esEdicion = !!id;
  const notaId = id ? Number(id) : undefined;

  const { data: pendiente } = usePendienteNota(clientUuid);
  const { mutateAsync: guardarPendiente, isPending: guardandoPendiente } =
    useGuardarNotaPendiente();

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
  const { data: tecnicasData, isError: errorTecnicas } = useTecnicas();
  const { data: usuarios, isSuccess: medicosListados } = useTodosLosUsuarios();
  const { data: pacientes } = useTodosLosPacientes();

  const opcionesDx = (diagnosticosData ?? []).map((d) => d.diagnostico);
  const opcionesProc = (procedimientosData ?? []).map((p) => p.intervencion);
  const opcionesTecnica = (tecnicasData ?? []).map((t) => t.tecnica);
  /*
    Solo médicos: el administrador registra notas del servicio pero no opera,
    así que no puede figurar en ninguna —ni como encargado ni en el equipo—, ni
    ponerse él ni ponerlo otro. Dejarlo fuera de esta lista es lo que impide
    ambas cosas en la interfaz; el servidor lo rechaza igual (ValidarEquipo).
  */
  const medicos = useMemo(
    () => (usuarios ?? []).filter((u) => u.rol === "medico"),
    [usuarios]
  );

  /*
    A quién se le asigna la nota si no se elige a nadie. El médico se la queda
    (es el caso normal: opera y registra); para cualquier otro rol queda en
    blanco, y el formulario no deja guardar hasta que se indique el médico.
  */
  const encargadoPorDefecto = perfil?.rol === "medico" ? perfil.id : "";
  const pacientesData = pacientes ?? [];

  const { data: notaExistente } = useObtenerNota(notaId ?? 0);
  /*
    Una nota que el servidor ya no deja tocar (plazo vencido, legalizada, o el
    médico no participó) se muestra igual, pero en solo lectura: los campos
    quedan deshabilitados y no hay botón de guardar. Así quien llega por el
    enlace directo entiende por qué, en vez de corregir todo y recibir un 403.
  */
  const bloqueo =
    esEdicion && notaExistente ? motivoBloqueo(notaExistente) : null;
  const soloLectura = bloqueo !== null;
  const { mutate: crearNota, isPending: creando } = useCrearNota();
  const { mutate: editarNota, isPending: editando } = useEditarNota(notaId ?? 0);
  const { mutateAsync: crearBiopsia } = useCrearBiopsia();
  const isPending = creando || editando || guardandoPendiente;

  /*
    Datos mínimos de la biopsia, solo al crear (PRD 0.5.0). Se capturan aquí
    porque es el momento: el médico acaba de sacar la muestra. En edición las
    biopsias se gestionan desde el detalle de la nota. Si el bloque queda sin
    tejido no se crea nada y el detalle avisa que falta registrarla.

    El bloque de captura está comentado más abajo (a pedido de los médicos), así
    que por ahora estos valores quedan vacíos y nunca se crea la biopsia desde
    aquí. Al reactivar el bloque hay que recuperar los setters:
      const [biopsiaTejido, setBiopsiaTejido] = useState("");
      const [biopsiaOjo, setBiopsiaOjo] = useState("");
      const [biopsiaDescripcion, setBiopsiaDescripcion] = useState("");
  */
  const [biopsiaTejido] = useState("");
  const [biopsiaOjo] = useState("");
  const [biopsiaDescripcion] = useState("");
  const capturaBiopsia = !esEdicion && !esPendiente;

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
      medicoEncargado: encargadoPorDefecto,
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
    if (!encargadoActual && encargadoPorDefecto) {
      setValue("medicoEncargado", encargadoPorDefecto, { shouldValidate: false });
    }
  }, [medicosListados, esEdicion, encargadoPorDefecto, getValues, setValue]);

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
        comentarios: notaExistente.comentarios ?? "",
        fechaComienzo: toDateInputValue(notaExistente.fechaComienzo),
        fechaCulminacion: toDateInputValue(notaExistente.fechaCulminacion),
        horaComienzo: notaExistente.horaComienzo,
        horaCulminacion: notaExistente.horaCulminacion,
        esElectiva: notaExistente.esElectiva,
        esEmergencia: notaExistente.esEmergencia,
        tuvoBiopsia: notaExistente.tuvoBiopsia,
        anestesia: normalizarAnestesia(notaExistente.anestesia),
        medicoEncargado: notaExistente.medicoEncargado ?? encargadoPorDefecto,
        equipo: equipoIds,
        tecnica: "",
      });
      const pac = (pacientesData ?? []).find((p) => p.id === notaExistente.idPaciente);
      if (pac) setPacienteSeleccionado(pac);
    }
  }, [esEdicion, notaExistente, reset, encargadoPorDefecto, pacientesData]);

  // Precarga de nota pendiente (corrección antes de subir). Los datos salen de
  // la cola local, no de la API: esta nota no existe en el servidor todavía.
  useEffect(() => {
    if (!esPendiente || !pendiente) return;
    const nota = pendiente.datos;
    reset({
      idPaciente: nota.idPaciente,
      dxPreOperatorio: nota.dxPreOperatorio,
      dxPostOperatorio: nota.dxPostOperatorio ?? "",
      intervencionRealizada: nota.intervencionRealizada,
      resumenIntervencion: nota.resumenIntervencion ?? "",
      comentarios: nota.comentarios ?? "",
      fechaComienzo: toDateInputValue(nota.fechaComienzo),
      fechaCulminacion: toDateInputValue(nota.fechaCulminacion),
      horaComienzo: nota.horaComienzo,
      horaCulminacion: nota.horaCulminacion,
      esElectiva: nota.esElectiva,
      esEmergencia: nota.esEmergencia,
      tuvoBiopsia: nota.tuvoBiopsia,
      anestesia: normalizarAnestesia(nota.anestesia),
      medicoEncargado: pendiente.medicoEncargadoId || encargadoPorDefecto,
      equipo: nota.equipo ?? [],
      tecnica: "",
    });
    const pac = (pacientesData ?? []).find((p) => p.id === nota.idPaciente);
    if (pac) setPacienteSeleccionado(pac);
  }, [esPendiente, pendiente, reset, encargadoPorDefecto, pacientesData]);

  /*
    El encargado que trae la nota puede no estar entre los elegibles: notas
    viejas que quedaron a nombre de un administrador, o de un médico que ya no
    está activo. Se limpia en cuanto se sabe —hace falta la lista cargada— para
    que el selector no muestre un vacío engañoso mientras el formulario guarda
    un id que el servidor va a rechazar. El admin puede corregir cualquier nota;
    lo que no puede es quedarse en ella, así que aquí indica quién operó.
  */
  useEffect(() => {
    if (!medicosListados) return;
    const encargadoActual = getValues("medicoEncargado");
    if (encargadoActual && !medicos.some((m) => m.id === encargadoActual)) {
      setValue("medicoEncargado", "", { shouldValidate: false });
    }
  }, [medicosListados, medicos, notaExistente, pendiente, getValues, setValue]);

  // ── Composición del resumen (docs/catalogo-clinico.md §1.4) ──────────────
  //
  // El médico no redacta desde cero: elige el procedimiento, que trae su
  // relato canónico, y le inserta las frases de las técnicas que usó.

  const intervencionActual = watch("intervencionRealizada");
  const tecnicaActual = watch("tecnica");

  const procedimientoElegido = useMemo(
    () =>
      (procedimientosData ?? []).find(
        (p) => p.intervencion === intervencionActual
      ),
    [procedimientosData, intervencionActual]
  );

  const tecnicaElegida = useMemo(
    () => (tecnicasData ?? []).find((t) => t.tecnica === tecnicaActual),
    [tecnicasData, tecnicaActual]
  );

  // Guarda el último relato precargado. Sirve para distinguir "el texto es el
  // que puse yo automáticamente" de "el médico ya escribió aquí": en el
  // segundo caso no se pisa nunca.
  const relatoPrecargado = useRef<string | null>(null);

  const cargarRelatoDelProcedimiento = useCallback(() => {
    const relato = procedimientoElegido?.resumen?.trim();
    if (!relato) return;
    relatoPrecargado.current = relato;
    setValue("resumenIntervencion", relato, { shouldDirty: true });
  }, [procedimientoElegido, setValue]);

  useEffect(() => {
    const relato = procedimientoElegido?.resumen?.trim();
    if (!relato) return;
    const actual = (getValues("resumenIntervencion") ?? "").trim();
    if (actual && actual !== relatoPrecargado.current) return;
    relatoPrecargado.current = relato;
    setValue("resumenIntervencion", relato, { shouldDirty: true });
  }, [procedimientoElegido, getValues, setValue]);

  // Valores de los huecos de la técnica seleccionada; arrancan en su default.
  const [valoresHuecos, setValoresHuecos] = useState<Record<string, string>>({});
  useEffect(() => {
    setValoresHuecos(valoresPorDefecto(tecnicaElegida?.huecos));
  }, [tecnicaElegida]);

  // Técnicas ya insertadas en el resumen, para que el médico no pierda la
  // cuenta mientras encadena varias.
  const [tecnicasAgregadas, setTecnicasAgregadas] = useState<string[]>([]);

  const agregarFraseDeTecnica = useCallback(() => {
    if (!tecnicaElegida?.frase) return;
    const frase = aplicarHuecos(
      tecnicaElegida.frase,
      tecnicaElegida.huecos,
      valoresHuecos
    );
    setValue(
      "resumenIntervencion",
      insertarFrase(getValues("resumenIntervencion") ?? "", frase),
      { shouldDirty: true }
    );
    setTecnicasAgregadas((previas) =>
      previas.includes(tecnicaElegida.tecnica)
        ? previas
        : [...previas, tecnicaElegida.tecnica]
    );
    // Se limpia el campo para poder elegir la siguiente técnica de inmediato.
    setValue("tecnica", "");
    // A partir de aquí el texto lleva mano del médico: cambiar de
    // procedimiento ya no lo reemplaza en silencio.
    relatoPrecargado.current = null;
  }, [tecnicaElegida, valoresHuecos, getValues, setValue]);

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
      const medicoEncargadoId = data.medicoEncargado ?? encargadoPorDefecto;
      /*
        Una nota antigua puede traer en el equipo a alguien que hoy no puede
        figurar en ella (un administrador, un médico dado de baja): al corregirla
        se descarta aquí, porque el equipo se reemplaza entero en cada guardado y
        reenviarlo tal cual moriría en el 400 del servidor. Solo se filtra con la
        lista ya cargada; sin ella no hay con qué comparar.
      */
      const equipo = medicosListados
        ? (data.equipo ?? []).filter((uid) => medicos.some((m) => m.id === uid))
        : (data.equipo ?? []);
      const nota = {
        id: notaId,
        dxPreOperatorio: data.dxPreOperatorio,
        dxPostOperatorio: data.dxPostOperatorio ?? "",
        intervencionRealizada: data.intervencionRealizada,
        resumenIntervencion: data.resumenIntervencion ?? "",
        comentarios: data.comentarios ?? "",
        fechaComienzo: new Date(data.fechaComienzo),
        fechaCulminacion: data.fechaCulminacion
          ? new Date(data.fechaCulminacion)
          : new Date(data.fechaComienzo),
        horaComienzo: data.horaComienzo || "00:00",
        horaCulminacion: data.horaCulminacion || "00:00",
        // El pabellón ya no se captura, pero se conserva el valor guardado
        // para no borrarlo al editar una nota antigua.
        pabellon: notaExistente?.pabellon ?? "",
        esElectiva: data.esElectiva ?? false,
        esEmergencia: data.esEmergencia ?? false,
        tuvoBiopsia: data.tuvoBiopsia ?? false,
        anestesia: data.anestesia ?? "",
        idPaciente: data.idPaciente,
        medicoEncargado: medicoEncargadoId,
        equipo,
        medicos: [],
        // El servidor ignora estos dos al escribir; van por tipar la nota.
        legalizada: notaExistente?.legalizada ?? false,
        puedeEditar: notaExistente?.puedeEditar ?? true,
      };
      const onError = (err: unknown) => {
        setErrorMsg(
          isApiError(err) && err.status === 400
            ? err.body || "Error de validación."
            : "Error al guardar la nota. Intenta de nuevo."
        );
      };
      // La biopsia que acompaña a la nota nueva, si el médico la describió.
      const biopsia: Biopsia | null =
        capturaBiopsia && data.tuvoBiopsia && biopsiaTejido.trim()
          ? {
              idPaciente: data.idPaciente,
              idMedicoResponsable: medicoEncargadoId,
              ojo: biopsiaOjo === "OD" || biopsiaOjo === "OI" || biopsiaOjo === "AO" ? biopsiaOjo : undefined,
              tejido: biopsiaTejido.trim(),
              descripcionMacroscopica: biopsiaDescripcion.trim(),
              diagnosticoPresuntivo: data.dxPostOperatorio || data.dxPreOperatorio || "",
              fechaToma: new Date(data.fechaComienzo),
              ...SIN_DESCRIPTORES,
              estado: "tomada",
              observaciones: "",
              notas: [],
              puedeEditar: true,
              puedeTramitar: true,
            }
          : null;

      if (esPendiente && clientUuid) {
        // Sigue en la cola: se corrige donde está y vuelve a quedar en espera.
        guardarPendiente({ clientUuid, nota, medicoEncargadoId })
          .then(() => { setExito(true); navigate("/mis-notas"); })
          .catch(onError);
      } else if (esEdicion && notaId) {
        editarNota({ nota, medicoEncargadoId }, {
          onSuccess: () => { setExito(true); navigate(`/notas/${notaId}`); },
          onError,
        });
      } else {
        crearNota({ nota, medicoEncargadoId }, {
          onSuccess: async (resultado) => {
            setExito(true);
            // La biopsia va detrás de la nota: en cola si la nota quedó en
            // cola, o contra el servidor si la nota ya tiene id. Si falla, la
            // nota ya está guardada y el detalle avisa que falta registrarla.
            if (biopsia) {
              try {
                await crearBiopsia(
                  resultado.estado === "en-cola"
                    ? { biopsia, notaClientUuid: resultado.clientUuid }
                    : { biopsia, notaId: resultado.nota.id }
                );
              } catch (err) {
                console.error("No se pudo registrar la biopsia junto a la nota", err);
              }
            }
            // Encolada: todavía no tiene ficha en el servidor a la que
            // navegar. Se vuelve al listado, donde aparece marcada como
            // pendiente, y se avisa de que está guardada aquí y no allá.
            if (resultado.estado === "en-cola") {
              navigate("/mis-notas", { state: { notaEncolada: true } });
              return;
            }
            navigate(`/notas/${resultado.nota.id}`);
          },
          onError,
        });
      }
    },
    [
      esEdicion,
      esPendiente,
      clientUuid,
      notaId,
      encargadoPorDefecto,
      medicos,
      medicosListados,
      notaExistente?.pabellon,
      crearNota,
      editarNota,
      crearBiopsia,
      guardarPendiente,
      navigate,
      capturaBiopsia,
      biopsiaTejido,
      biopsiaOjo,
      biopsiaDescripcion,
    ]
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-2xl font-semibold">
          {esPendiente
            ? "Corregir nota pendiente"
            : esEdicion
              ? soloLectura
                ? "Nota operatoria (solo lectura)"
                : "Editar nota operatoria"
              : "Nueva nota operatoria"}
        </h1>

        {soloLectura && (
          <Alert role="status">
            <Lock className="h-4 w-4" />
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>{bloqueo}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => navigate(`/notas/${notaId}`)}
              >
                Volver al detalle
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* En modo pendiente hay que dejar claro dónde está esta nota: no en el
            servidor, sino en este equipo, y con qué queda al guardar. */}
        {esPendiente && (
          <Alert className="border-amber-500/50">
            <CloudOff className="h-4 w-4" />
            <AlertDescription>
              Esta nota todavía no está en el servidor: existe solo en este
              equipo.
              {pendiente?.error && (
                <>
                  {" "}
                  El último intento de subirla fue rechazado —{" "}
                  <span className="font-medium">{pendiente.error}</span>
                </>
              )}{" "}
              Al guardar, se vuelve a poner en cola para el próximo intento.
            </AlertDescription>
          </Alert>
        )}

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

        {/*
          Enter no envía la nota. El navegador, por defecto, manda el
          formulario cuando se pulsa Enter en cualquier campo de una línea, y
          aquí eso significa registrar una nota operatoria a medio escribir
          mientras alguien tabula entre casillas. Se bloquea solo en los campos
          de texto: los botones siguen activándose con Enter —hace falta para
          quien navega con el teclado— y el área del resumen conserva el salto
          de línea. Para guardar hay que pulsar el botón.
        */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const destino = e.target as HTMLElement;
            const etiqueta = destino.tagName;
            if (etiqueta === "TEXTAREA" || etiqueta === "BUTTON") return;
            e.preventDefault();
          }}
          noValidate
          className="space-y-6"
        >
          {/*
            `fieldset disabled` apaga de una vez todos los controles del
            formulario, incluidos los botones de Radix: es la forma nativa de
            poner el formulario en solo lectura sin tocar campo por campo.
          */}
          <fieldset disabled={soloLectura} className="min-w-0 space-y-6">
          {/* ── Paciente ── */}
          <Card>
            <CardHeader><CardTitle className="text-base">Paciente *</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {pacienteSeleccionado ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{pacienteSeleccionado.nombre}</p>
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
                  {/*
                    La cédula es del paciente y se imprime en todas sus notas;
                    se ofrece aquí porque es el momento en que el médico nota
                    que falta.
                  */}
                  <CedulaPaciente paciente={pacienteSeleccionado} />
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
            {/*
              Los dos diagnósticos van uno debajo del otro y a todo el ancho,
              como en la hoja de papel, donde el preoperatorio es una lista
              numerada de hallazgos y el postoperatorio el estado con el que
              sale el paciente.
            */}
            <CardContent className="space-y-5">
              <Controller name="dxPreOperatorio" control={control}
                render={({ field }) => (
                  <CampoDiagnostico
                    id="dxPreOperatorio"
                    label="DX. PREOPERATORIO *"
                    opciones={opcionesDx}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.dxPreOperatorio?.message}
                  />
                )} />

              <Controller name="dxPostOperatorio" control={control}
                render={({ field }) => (
                  <CampoDiagnostico
                    id="dxPostOperatorio"
                    label="DX. POSTOPERATORIO"
                    opciones={opcionesDx}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )} />
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
                <p className="text-xs text-muted-foreground">
                  Elige una del catálogo para añadir su paso al resumen. Puedes
                  encadenar todas las que hagan falta.
                </p>
                <Controller name="tecnica" control={control}
                  render={({ field }) => (
                    <AutocompleteInput id="tecnica" value={field.value ?? ""}
                      onChange={field.onChange} opciones={opcionesTecnica}
                      permitirExplorar
                      placeholder="Elegir del catálogo o escribir para filtrar…" />
                  )} />

                {/*
                  Sin estos avisos, cualquier fallo del catálogo se manifiesta
                  como "el botón de agregar no aparece", sin explicar por qué.
                */}
                {errorTecnicas && (
                  <p className="text-xs text-destructive">
                    No se pudo cargar el catálogo de técnicas.
                  </p>
                )}
                {!errorTecnicas && opcionesTecnica.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    El catálogo de técnicas está vacío.
                  </p>
                )}
                {tecnicaActual && !tecnicaElegida && opcionesTecnica.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    «{tecnicaActual}» no está en el catálogo: escribe el paso
                    directamente en el resumen.
                  </p>
                )}
                {tecnicaElegida && !tecnicaElegida.frase && (
                  <p className="text-xs text-muted-foreground">
                    Esta técnica todavía no tiene una frase configurada, así que
                    no hay nada que añadir al resumen. Un admin puede definirla
                    en Catálogos.
                  </p>
                )}

                {tecnicasAgregadas.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-muted-foreground">
                      Ya en el resumen:
                    </span>
                    {tecnicasAgregadas.map((nombre) => (
                      <span
                        key={nombre}
                        className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
                      >
                        {nombre}
                      </span>
                    ))}
                  </div>
                )}

                {/*
                  La técnica del catálogo aporta una frase al resumen; sus
                  huecos son lo que cambia de una cirugía a otra.
                */}
                {tecnicaElegida?.frase && (
                  <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/40 p-3">
                    {(tecnicaElegida.huecos ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {(tecnicaElegida.huecos ?? []).map((hueco) => (
                          <div key={hueco.nombre} className="space-y-1">
                            <Label
                              htmlFor={`hueco-${hueco.nombre}`}
                              className="text-xs capitalize text-muted-foreground"
                            >
                              {hueco.nombre}
                            </Label>
                            <Input
                              id={`hueco-${hueco.nombre}`}
                              className="h-8 w-24"
                              value={valoresHuecos[hueco.nombre] ?? ""}
                              onChange={(e) =>
                                setValoresHuecos((v) => ({
                                  ...v,
                                  [hueco.nombre]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      «
                      {aplicarHuecos(
                        tecnicaElegida.frase,
                        tecnicaElegida.huecos,
                        valoresHuecos
                      )}
                      »
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={agregarFraseDeTecnica}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar al resumen
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="resumenIntervencion">Resumen de la intervención</Label>
                  {procedimientoElegido?.resumen && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={cargarRelatoDelProcedimiento}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Cargar relato del procedimiento
                    </Button>
                  )}
                </div>
                <Textarea id="resumenIntervencion" rows={8} {...register("resumenIntervencion")} />
                <p className="text-xs text-muted-foreground">
                  Se precarga con el relato del procedimiento elegido y es
                  editable. Lo que escribas nunca se reemplaza solo.
                </p>
              </div>

              {/*
                Los comentarios se capturan aparte para poder corregirlos sin
                tocar el relato, pero la nota se lee de corrido: al mostrarla o
                exportarla van al final, tras "Observaciones:".
              */}
              <div className="space-y-1">
                <Label htmlFor="comentarios">Comentarios</Label>
                <Textarea id="comentarios" rows={3} {...register("comentarios")} />
                <p className="text-xs text-muted-foreground">
                  Se agregan al final del resumen encabezados por
                  «{ENCABEZADO_OBSERVACIONES}».
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ── Fechas y horas ── */}
          <Card>
            <CardHeader><CardTitle className="text-base">Fechas y horas</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="fechaComienzo">Fecha de inicio *</Label>
                <Controller name="fechaComienzo" control={control}
                  render={({ field }) => (
                    <DateInput
                      id="fechaComienzo"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                {errors.fechaComienzo && (
                  <p className="text-sm text-destructive">{errors.fechaComienzo.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="fechaCulminacion">Fecha de culminación</Label>
                <Controller name="fechaCulminacion" control={control}
                  render={({ field }) => (
                    <DateInput
                      id="fechaCulminacion"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                {errors.fechaCulminacion && (
                  <p className="text-sm text-destructive">{errors.fechaCulminacion.message}</p>
                )}
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
              <div className="space-y-2">
                <Label>Anestesia *</Label>
                <Controller name="anestesia" control={control}
                  render={({ field }) => (
                    <RadioGroup
                      name="anestesia"
                      aria-label="Tipo de anestesia"
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      className="grid grid-cols-1 sm:grid-cols-2"
                      options={[
                        { value: "Local", label: "Local" },
                        { value: "General", label: "General" },
                      ]}
                    />
                  )}
                />
                {errors.anestesia && (
                  <p className="text-sm text-destructive">{errors.anestesia.message}</p>
                )}
              </div>

              {/*
                Electiva y emergencia son excluyentes entre sí (el tipo de
                intervención), aunque el backend las guarde como dos booleanos.
              */}
              <div className="space-y-2">
                <Label>Tipo de intervención *</Label>
                <RadioGroup
                  name="tipoIntervencion"
                  aria-label="Tipo de intervención"
                  value={
                    watch("esElectiva") ? "electiva"
                    : watch("esEmergencia") ? "emergencia"
                    : ""
                  }
                  onValueChange={(v) => {
                    setValue("esElectiva", v === "electiva", { shouldValidate: true });
                    setValue("esEmergencia", v === "emergencia", { shouldValidate: true });
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2"
                  options={[
                    { value: "electiva", label: "Electiva" },
                    { value: "emergencia", label: "Emergencia" },
                  ]}
                />
                {errors.esElectiva && (
                  <p className="text-sm text-destructive">{errors.esElectiva.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Biopsia</Label>
                {/* La rejilla lo deja del mismo ancho que una opción de arriba. */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Checkbox
                    label="Se tomó biopsia"
                    {...register("tuvoBiopsia")}
                  />
                </div>

                {/*
                  Datos mínimos de la muestra (PRD 0.5.0). Bloque desactivado a
                  pedido de los médicos: la biopsia se registra después desde
                  el detalle de la nota. Se conserva comentado por si vuelve.
                */}
                {/*
                {capturaBiopsia && watch("tuvoBiopsia") && (
                  <div className="mt-2 space-y-3 rounded-md border border-border bg-muted/40 p-3">
                    <p className="text-sm font-medium">Datos de la biopsia (opcional)</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="biopsia-tejido">Tejido</Label>
                        <AutocompleteInput
                          id="biopsia-tejido"
                          value={biopsiaTejido}
                          onChange={setBiopsiaTejido}
                          opciones={TEJIDOS_BIOPSIA}
                          permitirExplorar
                          placeholder="Pterigión, lesión palpebral…"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="biopsia-ojo">Ojo</Label>
                        <Select value={biopsiaOjo} onValueChange={setBiopsiaOjo}>
                          <SelectTrigger id="biopsia-ojo"><SelectValue placeholder="Sin indicar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Sin indicar</SelectItem>
                            <SelectItem value="OD">OD</SelectItem>
                            <SelectItem value="OI">OI</SelectItem>
                            <SelectItem value="AO">AO</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="biopsia-desc">Descripción macroscópica</Label>
                      <Textarea
                        id="biopsia-desc"
                        rows={2}
                        value={biopsiaDescripcion}
                        onChange={(e) => setBiopsiaDescripcion(e.target.value)}
                        placeholder="Tamaño, aspecto, número de fragmentos"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      El envío al laboratorio y el resultado se cargan después desde la nota.
                    </p>
                  </div>
                )}
                */}
              </div>
              {BACKEND_SUPPORTS_OJO_ESTADO && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <Label htmlFor="medicoEncargado">Médico encargado *</Label>
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
                {errors.medicoEncargado && (
                  <p className="text-sm text-destructive">{errors.medicoEncargado.message}</p>
                )}
                {/*
                  El admin registra la nota, pero la cirugía es de un médico:
                  aquí se dice de quién, porque él no puede quedar en ella.
                */}
                {perfil?.rol !== "medico" && (
                  <p className="text-xs text-muted-foreground">
                    Indica el médico que operó: quien registra la nota desde una
                    cuenta de administrador no figura en ella.
                  </p>
                )}
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
            {!soloLectura && (
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Guardando…"
                  : esPendiente
                    ? "Guardar y volver a encolar"
                    : esEdicion
                      ? "Guardar cambios"
                      : "Crear nota"}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
          </div>
          </fieldset>
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
