/**
 * Tarjeta "Biopsias" del detalle de la nota: lista las vinculadas, avisa si la
 * nota declara biopsia y no hay ninguna registrada, y permite registrar una
 * nueva o vincular una existente. Nada de esto depende del plazo de edición
 * ni de la legalización de la nota: el trámite de la muestra sigue su curso.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Link2, Microscope, Plus, Unlink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useBiopsiasDeNota,
  useCrearBiopsia,
  useDesvincularBiopsia,
} from "@/hooks/useBiopsias";
import { useSessionStore } from "@/stores/sessionStore";
import { isApiError } from "@/api/errors";
import { aISOLocal, formatFechaUI } from "@/lib/datetime";
import type { Biopsia, Nota } from "@/domain/models";
import type {
  BiopsiaFormInput,
  BiopsiaFormValues,
} from "@/domain/validation/biopsia.validation";
import { BiopsiaBadge } from "./BiopsiaBadge";
import { FormBiopsiaDialog } from "./FormBiopsiaDialog";
import { VincularBiopsiaDialog } from "./VincularBiopsiaDialog";
import { descriptoresDesdeFormulario } from "./descriptoresForm";

/** Arma la biopsia de dominio a partir del formulario y de la nota. */
export function biopsiaDesdeFormulario(
  v: BiopsiaFormValues,
  idPaciente: string
): Biopsia {
  return {
    idPaciente,
    idMedicoResponsable: v.idMedicoResponsable,
    ojo: v.ojo ? v.ojo : undefined,
    tejido: v.tejido,
    descripcionMacroscopica: "",
    diagnosticoPresuntivo: v.diagnosticoPresuntivo ?? "",
    fechaToma: new Date(v.fechaToma),
    ...descriptoresDesdeFormulario(v),
    estado: "tomada",
    observaciones: "",
    notas: [],
    puedeEditar: true,
    puedeTramitar: true,
  };
}

export function TarjetaBiopsiasNota({ nota }: { nota: Nota }) {
  const perfil = useSessionStore((s) => s.perfil);
  const notaId = nota.id ?? 0;
  const { data: biopsias = [], isLoading } = useBiopsiasDeNota(notaId);
  const { mutateAsync: crear, isPending: creando } = useCrearBiopsia();
  const { mutateAsync: desvincular } = useDesvincularBiopsia(notaId);

  const [registrar, setRegistrar] = useState(false);
  const [vincular, setVincular] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  // Mismo criterio que editar la nota, sin el plazo: admin o participante.
  const puedeGestionar =
    perfil?.rol === "admin" ||
    (perfil?.rol === "medico" && nota.medicos.some((m) => m.id === perfil.id));

  const sinRegistro = nota.tuvoBiopsia && !isLoading && biopsias.length === 0;

  const valorInicial: Partial<BiopsiaFormInput> = {
    fechaToma: aISOLocal(nota.fechaComienzo),
    ojo: nota.ojo ?? "",
    diagnosticoPresuntivo: nota.dxPostOperatorio || nota.dxPreOperatorio || "",
    idMedicoResponsable: nota.medicoEncargado ?? "",
  };

  const alRegistrar = async (v: BiopsiaFormValues) => {
    setErrorForm(null);
    try {
      await crear({ biopsia: biopsiaDesdeFormulario(v, nota.idPaciente), notaId });
      setRegistrar(false);
    } catch (err) {
      setErrorForm(isApiError(err) ? err.body || "No se pudo registrar." : "No se pudo registrar la biopsia.");
    }
  };

  const alDesvincular = async (b: Biopsia) => {
    if (!window.confirm(`¿Desvincular la biopsia «${b.tejido}» de esta nota? La biopsia no se borra.`)) return;
    setError(null);
    try {
      await desvincular(b.id!);
    } catch (err) {
      setError(isApiError(err) ? err.body || "No se pudo desvincular." : "No se pudo desvincular.");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Microscope className="h-4 w-4 text-muted-foreground" aria-hidden />
          Biopsias
        </CardTitle>
        {puedeGestionar && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={sinRegistro ? "default" : "outline"} onClick={() => setRegistrar(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar biopsia
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setVincular(true)}>
              <Link2 className="mr-2 h-4 w-4" />
              Vincular existente
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {sinRegistro && (
          <Alert className="border-amber-500/50">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription>
              La nota declara que se tomó biopsia, pero no hay ninguna registrada.
              {puedeGestionar ? " Regístrala para seguir su envío y su resultado." : ""}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground" role="status">Cargando biopsias…</p>
        ) : biopsias.length === 0 ? (
          !sinRegistro && (
            <p className="text-sm text-muted-foreground">Sin biopsias registradas.</p>
          )
        ) : (
          <ul className="space-y-2">
            {biopsias.map((b) => {
              const vinculo = b.notas.find((n) => n.idNota === notaId);
              const origen = b.notas.find((n) => n.rol === "origen");
              return (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <Link to={`/biopsias/${b.id}`} className="font-medium hover:underline">
                      {b.tejido}
                      {b.ojo && <span className="text-muted-foreground"> · {b.ojo}</span>}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Tomada el {formatFechaUI(b.fechaToma)}
                      {b.numeroPatologia ? ` · ${b.numeroPatologia}` : ""}
                      {vinculo?.rol === "seguimiento" && origen
                        ? ` · de la cirugía del ${formatFechaUI(origen.fechaComienzo)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <BiopsiaBadge estado={b.estado} />
                    {puedeGestionar && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label={`Desvincular ${b.tejido}`}
                        title="Desvincular de esta nota"
                        onClick={() => void alDesvincular(b)}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <FormBiopsiaDialog
        open={registrar}
        onOpenChange={setRegistrar}
        titulo="Registrar biopsia"
        descripcion="Los datos de la muestra tal como salió de quirófano. El envío y el resultado se cargan después."
        valorInicial={valorInicial}
        onSubmit={alRegistrar}
        guardando={creando}
        error={errorForm}
        submitLabel="Registrar"
      />

      <VincularBiopsiaDialog
        open={vincular}
        onOpenChange={setVincular}
        notaId={notaId}
        idPaciente={nota.idPaciente}
        yaVinculadas={biopsias.map((b) => b.id!).filter(Boolean)}
      />
    </Card>
  );
}
