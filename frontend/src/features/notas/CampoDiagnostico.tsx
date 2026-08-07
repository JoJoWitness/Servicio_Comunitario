/**
 * Campo de diagnóstico con la forma que tiene en la nota operatoria de papel:
 * un bloque de varias líneas donde el médico numera los hallazgos
 *
 *   1. TOAP OI
 *   1.1 Herida corneal de espesor total autosellada
 *   1.2 Catarata traumática
 *   2. Potencial endoftalmitis
 *
 * El catálogo no sustituye al bloque, lo alimenta: se elige una entrada y se
 * añade como renglón numerado, que después se puede editar a mano (ahí es donde
 * salen los subniveles y las anotaciones propias de cada caso).
 */

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutocompleteInput } from "./AutocompleteInput";

/**
 * Siguiente número de la lista: uno más que el mayor de primer nivel que ya
 * haya escrito. Se ignoran los subniveles ("1.2") porque no abren hallazgo.
 */
export function siguienteNumero(texto: string): number {
  let mayor = 0;
  for (const linea of texto.split("\n")) {
    const m = /^\s*(\d+)\.(?!\d)/.exec(linea);
    if (m) mayor = Math.max(mayor, Number(m[1]));
  }
  return mayor + 1;
}

/** Añade el diagnóstico como un renglón numerado al final del bloque. */
export function agregarRenglon(texto: string, diagnostico: string): string {
  const limpio = diagnostico.trim();
  if (!limpio) return texto;

  const renglon = `${siguienteNumero(texto)}. ${limpio}`;
  const base = texto.replace(/\s+$/, "");
  return base ? `${base}\n${renglon}` : renglon;
}

interface CampoDiagnosticoProps {
  id: string;
  label: string;
  opciones: string[];
  value: string;
  onChange: (valor: string) => void;
  onBlur?: () => void;
  error?: string;
}

export function CampoDiagnostico({
  id,
  label,
  opciones,
  value,
  onChange,
  onBlur,
  error,
}: CampoDiagnosticoProps) {
  const [seleccion, setSeleccion] = useState("");

  const agregar = () => {
    if (!seleccion.trim()) return;
    onChange(agregarRenglon(value, seleccion));
    setSeleccion("");
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>

      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <AutocompleteInput
            id={`${id}-catalogo`}
            value={seleccion}
            onChange={setSeleccion}
            opciones={opciones}
            permitirExplorar
            placeholder="Elegir del catálogo o escribir…"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!seleccion.trim()}
          onClick={agregar}
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar
        </Button>
      </div>

      <Textarea
        id={id}
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={"1. Primer diagnóstico\n1.1 Detalle\n2. Segundo diagnóstico"}
        aria-describedby={error ? `${id}-error` : undefined}
      />

      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
