/**
 * Biopsia suelta desde la pantalla de seguimiento, sin pasar por la nota:
 * primero se elige el paciente (con búsqueda), luego se llenan los datos de
 * la muestra y, si la cirugía ya tiene nota, se liga como origen ahí mismo.
 */

import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectorPacienteDialog } from "@/features/notas/SelectorPacienteDialog";
import { useCrearBiopsia } from "@/hooks/useBiopsias";
import { useNotasDePaciente } from "@/hooks/useNotas";
import { useSessionStore } from "@/stores/sessionStore";
import { isApiError } from "@/api/errors";
import { aISOLocal, formatFechaUI } from "@/lib/datetime";
import type { Paciente } from "@/domain/models";
import type { BiopsiaFormInput, BiopsiaFormValues } from "@/domain/validation/biopsia.validation";
import { FormBiopsiaDialog } from "./FormBiopsiaDialog";
import { biopsiaDesdeFormulario } from "./TarjetaBiopsiasNota";

interface NuevaBiopsiaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se avisa cuando la biopsia quedó en la cola sin conexión (no hay panel al que ir). */
  onEncolada?: () => void;
}

export function NuevaBiopsiaDialog({ open, onOpenChange, onEncolada }: NuevaBiopsiaDialogProps) {
  const navigate = useNavigate();
  const perfil = useSessionStore((s) => s.perfil);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  // El selector llama a onSelect y acto seguido a onClose; ese cierre no debe
  // deshacer la elección. Se distingue con una bandera, no con el estado, que
  // en ese mismo evento todavía no cambió.
  const recienElegido = useRef(false);
  const [notaId, setNotaId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync: crear, isPending } = useCrearBiopsia();
  const { data: notas = [] } = useNotasDePaciente(paciente?.id ?? "");

  const nota = notas.find((n) => String(n.id) === notaId);

  // Con nota, sus datos; sin ella, hoy y el médico de la sesión (el admin elige).
  const valorInicial = useMemo<Partial<BiopsiaFormInput>>(
    () =>
      nota
        ? {
            fechaToma: aISOLocal(nota.fechaComienzo),
            ojo: nota.ojo ?? "",
            idMedicoResponsable: nota.medicoEncargado ?? "",
            diagnosticoPresuntivo: nota.dxPostOperatorio || nota.dxPreOperatorio || "",
          }
        : {
            fechaToma: aISOLocal(new Date()),
            idMedicoResponsable: perfil?.rol === "medico" ? perfil.id : "",
          },
    [nota, perfil]
  );

  const cerrar = () => {
    setPaciente(null);
    setNotaId("");
    setError(null);
    onOpenChange(false);
  };

  const alGuardar = async (v: BiopsiaFormValues) => {
    if (!paciente) return;
    setError(null);
    try {
      const resultado = await crear({
        biopsia: biopsiaDesdeFormulario(v, paciente.id),
        notaId: nota?.id,
      });
      cerrar();
      if (resultado.estado === "subida") {
        navigate(`/biopsias/${resultado.biopsia.id}`);
      } else {
        onEncolada?.();
      }
    } catch (err) {
      setError(isApiError(err) ? err.body || "No se pudo registrar la biopsia." : "No se pudo registrar la biopsia.");
    }
  };

  return (
    <>
      {/* Paso 1: el paciente, con el mismo buscador del formulario de nota. */}
      <SelectorPacienteDialog
        open={open && !paciente}
        onClose={() => {
          if (recienElegido.current) {
            recienElegido.current = false;
            return;
          }
          cerrar();
        }}
        onSelect={(p) => {
          recienElegido.current = true;
          setPaciente(p);
        }}
      />

      {/* Paso 2: los datos de la muestra, con la nota de origen opcional arriba. */}
      <FormBiopsiaDialog
        open={open && paciente !== null}
        onOpenChange={(abierto) => { if (!abierto) cerrar(); }}
        titulo="Nueva biopsia"
        descripcion={paciente ? `Paciente: ${paciente.nombre}. Si la muestra salió de una cirugía con nota, elígela para ligarla.` : undefined}
        valorInicial={valorInicial}
        claveReinicio={notaId}
        onSubmit={alGuardar}
        guardando={isPending}
        error={error}
        submitLabel="Registrar"
        encabezado={
          <div className="space-y-1">
            <Label htmlFor="nb-nota">Nota operatoria de origen</Label>
            <Select value={notaId} onValueChange={setNotaId}>
              <SelectTrigger id="nb-nota">
                <SelectValue placeholder="Sin nota (se puede vincular después)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin nota (se puede vincular después)</SelectItem>
                {notas
                  .filter((n) => n.id !== undefined)
                  .map((n) => (
                    <SelectItem key={n.id} value={String(n.id)}>
                      {formatFechaUI(n.fechaComienzo)} · {n.intervencionRealizada}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
    </>
  );
}
