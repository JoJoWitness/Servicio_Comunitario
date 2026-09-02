/**
 * Panel de una biopsia: cabecera, línea de tiempo del trámite, datos de la
 * muestra, envío, resultado y las notas a las que está ligada.
 * Ruta: /biopsias/:id
 */

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Link2, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBiopsia, useEditarBiopsia, useEliminarBiopsia } from "@/hooks/useBiopsias";
import { useNotasDePaciente } from "@/hooks/useNotas";
import { vincularBiopsia } from "@/api/endpoints/biopsias";
import { isApiError } from "@/api/errors";
import { useSessionStore } from "@/stores/sessionStore";
import { aISOLocal, formatFechaUI } from "@/lib/datetime";
import type { Biopsia, EstadoBiopsia } from "@/domain/models";
import type { BiopsiaFormValues } from "@/domain/validation/biopsia.validation";
import { BiopsiaBadge } from "./BiopsiaBadge";
import { FormBiopsiaDialog } from "./FormBiopsiaDialog";
import { LineaTiempoBiopsia, type AvanceBiopsia } from "./LineaTiempoBiopsia";

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{valor}</dd>
    </div>
  );
}

export default function BiopsiaPanelPage() {
  const { id } = useParams<{ id: string }>();
  const biopsiaId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const perfil = useSessionStore((s) => s.perfil);

  const { data: biopsia, isLoading, isError } = useBiopsia(biopsiaId);
  const { mutateAsync: editar, isPending: guardando } = useEditarBiopsia(biopsiaId);
  const { mutateAsync: eliminar, isPending: eliminando } = useEliminarBiopsia();
  const { data: notasPaciente = [] } = useNotasDePaciente(biopsia?.idPaciente ?? "");

  const [editarDatos, setEditarDatos] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogBaja, setDialogBaja] = useState(false);
  const [vincularA, setVincularA] = useState(false);
  const [notaElegida, setNotaElegida] = useState<number | null>(null);

  const { mutateAsync: vincular, isPending: vinculando } = useMutation({
    mutationFn: ({ notaId }: { notaId: number }) =>
      vincularBiopsia(notaId, biopsiaId, "seguimiento"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biopsias"] });
      queryClient.invalidateQueries({ queryKey: ["nota"] });
    },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6">
          <p className="text-sm text-muted-foreground" role="status">Cargando biopsia…</p>
        </div>
      </AppLayout>
    );
  }

  if (isError || !biopsia) {
    return (
      <AppLayout>
        <div className="space-y-4 p-4 sm:p-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Alert variant="destructive" role="alert">
            <AlertDescription>La biopsia no existe o fue dada de baja.</AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  const esResponsable = perfil?.id === biopsia.idMedicoResponsable;
  const puedeRetroceder = perfil?.rol === "admin" || esResponsable;
  const puedeDarBaja = puedeRetroceder;
  const responsable = biopsia.medicoResponsable
    ? `${biopsia.medicoResponsable.nombres} ${biopsia.medicoResponsable.apellidos}`.trim()
    : undefined;

  const guardar = async (cambios: Partial<Biopsia>) => {
    setError(null);
    try {
      await editar({ ...biopsia, ...cambios });
    } catch (err) {
      const msg = isApiError(err) ? err.body || "No se pudo guardar." : "No se pudo guardar.";
      setError(msg);
      throw new Error(msg);
    }
  };

  const alAvanzar = async (avance: AvanceBiopsia) => guardar(avance);

  const alRetroceder = async (estado: EstadoBiopsia) => {
    const cambios: Partial<Biopsia> = { estado };
    // El servidor limpia igual; aquí se refleja para que la caché coincida.
    if (estado !== "entregada") cambios.fechaEntrega = undefined;
    if (estado === "tomada" || estado === "enviada") {
      cambios.resultado = undefined;
      cambios.fechaResultado = undefined;
    }
    if (estado === "tomada") cambios.fechaEnvio = undefined;
    await guardar(cambios).catch(() => undefined);
  };

  const alEditarDatos = async (v: BiopsiaFormValues) => {
    setErrorForm(null);
    try {
      await editar({
        ...biopsia,
        tejido: v.tejido,
        ojo: v.ojo ? v.ojo : undefined,
        descripcionMacroscopica: v.descripcionMacroscopica ?? "",
        diagnosticoPresuntivo: v.diagnosticoPresuntivo ?? "",
        fechaToma: new Date(v.fechaToma),
        idMedicoResponsable: v.idMedicoResponsable,
        observaciones: v.observaciones ?? "",
      });
      setEditarDatos(false);
    } catch (err) {
      setErrorForm(isApiError(err) ? err.body || "No se pudo guardar." : "No se pudo guardar.");
    }
  };

  const alDarBaja = async () => {
    setError(null);
    try {
      await eliminar(biopsia);
      navigate(-1);
    } catch (err) {
      setDialogBaja(false);
      setError(isApiError(err) ? err.body || "No se pudo dar de baja." : "No se pudo dar de baja.");
    }
  };

  const notasVinculadas = new Set(biopsia.notas.map((n) => n.idNota));
  const notasCandidatas = notasPaciente.filter((n) => n.id !== undefined && !notasVinculadas.has(n.id));

  const alVincular = async () => {
    if (notaElegida === null) return;
    setError(null);
    try {
      await vincular({ notaId: notaElegida });
      setVincularA(false);
      setNotaElegida(null);
    } catch (err) {
      setError(isApiError(err) ? err.body || "No se pudo vincular." : "No se pudo vincular.");
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div className="flex flex-wrap gap-2">
            {biopsia.puedeEditar && (
              <Button size="sm" variant="outline" onClick={() => setEditarDatos(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar datos
              </Button>
            )}
            {puedeDarBaja && (
              <Button size="sm" variant="destructive" onClick={() => setDialogBaja(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Dar de baja
              </Button>
            )}
          </div>
        </div>

        {/* Cabecera */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">
              {biopsia.tejido}
              {biopsia.ojo && <span className="text-muted-foreground"> · {biopsia.ojo}</span>}
            </h1>
            <BiopsiaBadge estado={biopsia.estado} />
          </div>
          <p className="text-sm text-muted-foreground">
            {biopsia.pacienteNombre && (
              <>
                Paciente:{" "}
                <Link to={`/pacientes/${biopsia.idPaciente}`} className="font-medium text-foreground hover:underline">
                  {biopsia.pacienteNombre}
                </Link>
                {" · "}
              </>
            )}
            Tomada el {formatFechaUI(biopsia.fechaToma)}
            {biopsia.numeroPatologia ? ` · N.° ${biopsia.numeroPatologia}` : ""}
          </p>
        </div>

        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Ciclo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trámite</CardTitle>
          </CardHeader>
          <CardContent>
            <LineaTiempoBiopsia
              biopsia={biopsia}
              puedeTramitar={biopsia.puedeTramitar}
              puedeEditar={biopsia.puedeEditar}
              puedeRetroceder={puedeRetroceder}
              onAvanzar={alAvanzar}
              onRetroceder={alRetroceder}
              guardando={guardando}
            />
          </CardContent>
        </Card>

        {/* Muestra */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Muestra</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <Campo label="Tejido" valor={biopsia.tejido} />
              <Campo label="Ojo" valor={biopsia.ojo} />
              <Campo label="Fecha de toma" valor={formatFechaUI(biopsia.fechaToma)} />
              <Campo label="Médico responsable" valor={responsable} />
              <div className="sm:col-span-2">
                <Campo label="Diagnóstico presuntivo" valor={biopsia.diagnosticoPresuntivo} />
              </div>
              <div className="sm:col-span-2">
                <Campo label="Descripción macroscópica" valor={biopsia.descripcionMacroscopica} />
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Envío y resultado */}
        {(biopsia.fechaEnvio || biopsia.laboratorio || biopsia.numeroPatologia || biopsia.resultado) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Laboratorio</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <Campo label="Laboratorio" valor={biopsia.laboratorio} />
                <Campo label="N.° de patología" valor={biopsia.numeroPatologia} />
                <Campo label="Fecha de envío" valor={biopsia.fechaEnvio ? formatFechaUI(biopsia.fechaEnvio) : undefined} />
                <Campo label="Fecha del resultado" valor={biopsia.fechaResultado ? formatFechaUI(biopsia.fechaResultado) : undefined} />
                <Campo label="Entregado al paciente" valor={biopsia.fechaEntrega ? formatFechaUI(biopsia.fechaEntrega) : undefined} />
                {biopsia.resultado && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted-foreground">Resultado</dt>
                    <dd className="whitespace-pre-wrap text-sm">{biopsia.resultado}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}

        {biopsia.observaciones && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{biopsia.observaciones}</p>
            </CardContent>
          </Card>
        )}

        {/* Notas vinculadas */}
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Notas operatorias</CardTitle>
            {biopsia.puedeEditar && (
              <Button size="sm" variant="ghost" onClick={() => setVincularA(true)}>
                <Link2 className="mr-2 h-4 w-4" />
                Vincular a otra nota
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {biopsia.notas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin nota vinculada. Se puede ligar desde aquí o desde la nota.
              </p>
            ) : (
              <ul className="space-y-2">
                {biopsia.notas.map((n) => (
                  <li key={n.idNota} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                    <div>
                      <Link to={`/notas/${n.idNota}`} className="font-medium hover:underline">
                        {n.intervencion}
                      </Link>
                      <p className="text-xs text-muted-foreground">{formatFechaUI(n.fechaComienzo)}</p>
                    </div>
                    <Badge variant={n.rol === "origen" ? "secondary" : "outline"}>
                      {n.rol === "origen" ? "Origen" : "Seguimiento"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <FormBiopsiaDialog
        open={editarDatos}
        onOpenChange={setEditarDatos}
        titulo="Editar datos de la muestra"
        valorInicial={{
          tejido: biopsia.tejido,
          ojo: biopsia.ojo ?? "",
          descripcionMacroscopica: biopsia.descripcionMacroscopica,
          diagnosticoPresuntivo: biopsia.diagnosticoPresuntivo,
          fechaToma: aISOLocal(new Date(
            biopsia.fechaToma.getUTCFullYear(),
            biopsia.fechaToma.getUTCMonth(),
            biopsia.fechaToma.getUTCDate()
          )),
          idMedicoResponsable: biopsia.idMedicoResponsable,
          observaciones: biopsia.observaciones,
        }}
        onSubmit={alEditarDatos}
        guardando={guardando}
        error={errorForm}
        submitLabel="Guardar cambios"
      />

      <Dialog open={vincularA} onOpenChange={setVincularA}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular a otra nota</DialogTitle>
            <DialogDescription>
              Solo notas de este paciente. Quedará como seguimiento (una reintervención motivada por el resultado).
            </DialogDescription>
          </DialogHeader>
          {notasCandidatas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay otras notas del paciente.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {notasCandidatas.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setNotaElegida(n.id!)}
                    className={
                      "flex w-full flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-left text-sm hover:bg-accent/50 " +
                      (notaElegida === n.id ? "border-primary bg-primary/10" : "")
                    }
                  >
                    <span className="font-medium">{n.intervencionRealizada}</span>
                    <span className="text-xs text-muted-foreground">{formatFechaUI(n.fechaComienzo)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVincularA(false)}>Cancelar</Button>
            <Button onClick={() => void alVincular()} disabled={notaElegida === null || vinculando}>
              {vinculando ? "Vinculando…" : "Vincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogBaja} onOpenChange={setDialogBaja}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Dar de baja esta biopsia?</DialogTitle>
            <DialogDescription>
              Dejará de aparecer en la nota, en el paciente y en el seguimiento. El registro se conserva.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogBaja(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => void alDarBaja()} disabled={eliminando}>
              {eliminando ? "Dando de baja…" : "Dar de baja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
