/**
 * Ida y vuelta entre los campos de la solicitud de biopsia en el dominio y
 * su forma en el formulario (donde "sin indicar" es "" y los booleanos son
 * "si" / "no" / "").
 */

import type { Biopsia } from "@/domain/models";
import type { BiopsiaFormInput, BiopsiaFormValues } from "@/domain/validation/biopsia.validation";

type Descriptores = Pick<
  Biopsia,
  | "tipoBiopsia"
  | "tipoCitologia"
  | "centroToma"
  | "centroTomaOtro"
  | "tipoMuestra"
  | "tipoMuestraOtro"
  | "ubicacion"
  | "bordes"
  | "color"
  | "colorOtro"
  | "tamano"
  | "tamanoOtro"
  | "altura"
  | "cambiosAsociados"
  | "tratamientosPrevios"
  | "tratamientosPreviosCual"
>;

/** Valores por defecto de una biopsia recién armada, sin descriptores. */
export const SIN_DESCRIPTORES: Descriptores = {
  centroToma: "hcsc",
  ubicacion: [],
  color: [],
  cambiosAsociados: [],
};

/** Con lo que arranca el formulario cuando no hay nada cargado. */
export const FORMULARIO_BIOPSIA_VACIO: Partial<BiopsiaFormInput> = {
  ojo: "",
  centroToma: "hcsc",
  ubicacion: [],
  color: [],
  cambiosAsociados: [],
};

const oNada = (s?: string) => (s?.trim() ? s.trim() : undefined);

/** Del formulario al dominio. */
export function descriptoresDesdeFormulario(v: BiopsiaFormValues): Descriptores {
  return {
    tipoBiopsia: (v.tipoBiopsia || undefined) as Descriptores["tipoBiopsia"],
    tipoCitologia: (v.tipoCitologia || undefined) as Descriptores["tipoCitologia"],
    centroToma: (v.centroToma || "hcsc") as Descriptores["centroToma"],
    centroTomaOtro: v.centroToma === "otro" ? oNada(v.centroTomaOtro) : undefined,
    tipoMuestra: (v.tipoMuestra || undefined) as Descriptores["tipoMuestra"],
    tipoMuestraOtro: v.tipoMuestra === "otro" ? oNada(v.tipoMuestraOtro) : undefined,
    ubicacion: v.ubicacion,
    bordes: (v.bordes || undefined) as Descriptores["bordes"],
    color: v.color,
    colorOtro: oNada(v.colorOtro),
    tamano: (v.tamano || undefined) as Descriptores["tamano"],
    tamanoOtro: v.tamano === "otro" ? oNada(v.tamanoOtro) : undefined,
    altura: (v.altura || undefined) as Descriptores["altura"],
    cambiosAsociados: v.cambiosAsociados,
    tratamientosPrevios:
      v.tratamientosPrevios === "si" ? true : v.tratamientosPrevios === "no" ? false : undefined,
    tratamientosPreviosCual: v.tratamientosPrevios === "si" ? oNada(v.tratamientosPreviosCual) : undefined,
  };
}

/** Del dominio al formulario, para corregir una biopsia existente. */
export function descriptoresAFormulario(b: Biopsia): Partial<BiopsiaFormInput> {
  return {
    tipoBiopsia: b.tipoBiopsia ?? "",
    tipoCitologia: b.tipoCitologia ?? "",
    centroToma: b.centroToma ?? "hcsc",
    centroTomaOtro: b.centroTomaOtro ?? "",
    tipoMuestra: b.tipoMuestra ?? "",
    tipoMuestraOtro: b.tipoMuestraOtro ?? "",
    ubicacion: b.ubicacion ?? [],
    bordes: b.bordes ?? "",
    color: b.color ?? [],
    colorOtro: b.colorOtro ?? "",
    tamano: b.tamano ?? "",
    tamanoOtro: b.tamanoOtro ?? "",
    altura: b.altura ?? "",
    cambiosAsociados: b.cambiosAsociados ?? [],
    tratamientosPrevios:
      b.tratamientosPrevios === true ? "si" : b.tratamientosPrevios === false ? "no" : "",
    tratamientosPreviosCual: b.tratamientosPreviosCual ?? "",
  };
}
