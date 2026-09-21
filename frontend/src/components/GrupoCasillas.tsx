/**
 * Grupo de casillas para elegir varios valores de una lista, pensado para
 * `Controller` de react-hook-form: recibe el arreglo elegido y devuelve el
 * nuevo arreglo al marcar o desmarcar.
 */

import { Checkbox } from "@/components/ui/checkbox";
import type { Opcion } from "@/domain/catalogosBiopsia";

interface GrupoCasillasProps<V extends string> {
  opciones: readonly Opcion<V>[];
  value: readonly V[];
  onChange: (valores: V[]) => void;
  /** Para que las casillas tengan id estable y la etiqueta las apunte. */
  idPrefijo: string;
  "aria-labelledby"?: string;
}

export function GrupoCasillas<V extends string>({
  opciones,
  value,
  onChange,
  idPrefijo,
  ...aria
}: GrupoCasillasProps<V>) {
  const alternar = (v: V, marcado: boolean) =>
    onChange(marcado ? [...new Set([...value, v])] : value.filter((x) => x !== v));
  return (
    <div className="flex flex-wrap gap-2" role="group" {...aria}>
      {opciones.map((o) => (
        <Checkbox
          key={o.value}
          id={`${idPrefijo}-${o.value}`}
          label={o.label}
          containerClassName="py-1.5"
          checked={value.includes(o.value)}
          onChange={(e) => alternar(o.value, e.target.checked)}
        />
      ))}
    </div>
  );
}
