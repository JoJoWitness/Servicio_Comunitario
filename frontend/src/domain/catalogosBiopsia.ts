/**
 * Vocabularios de la "Solicitud de biopsia o citología" (docs/Biopsia.pdf).
 *
 * Los valores coinciden con los CHECK del esquema y con
 * `models/biopsias/descriptores.go`; las etiquetas son las del formulario en
 * papel, para que la pantalla y la hoja impresa digan lo mismo.
 */

export interface Opcion<V extends string = string> {
  value: V;
  label: string;
}

export const TIPOS_BIOPSIA = [
  { value: "incisional", label: "Incisional" },
  { value: "excisional", label: "Excisional" },
  { value: "trucut", label: "Trucut" },
] as const satisfies readonly Opcion[];
export type TipoBiopsia = (typeof TIPOS_BIOPSIA)[number]["value"];

export const TIPOS_CITOLOGIA = [
  { value: "impronta", label: "Impronta" },
  { value: "respronta", label: "Respronta" },
  { value: "aspiracion_aguja_fina", label: "Aspiración aguja fina" },
] as const satisfies readonly Opcion[];
export type TipoCitologia = (typeof TIPOS_CITOLOGIA)[number]["value"];

export const CENTROS_TOMA = [
  { value: "hcsc", label: "HCSC" },
  { value: "ivss", label: "IVSS" },
  { value: "otro", label: "Otro" },
] as const satisfies readonly Opcion[];
export type CentroToma = (typeof CENTROS_TOMA)[number]["value"];

export const TIPOS_MUESTRA = [
  { value: "cavidad_orbitaria", label: "Cavidad Orbitaria" },
  { value: "globo_ocular", label: "Globo Ocular" },
  { value: "conjuntiva", label: "Conjuntiva" },
  { value: "parpado", label: "Párpado" },
  { value: "mejilla", label: "Mejilla" },
  { value: "nariz", label: "Nariz" },
  { value: "ceja", label: "Ceja" },
  { value: "frente", label: "Frente" },
  { value: "cornea", label: "Córnea" },
  { value: "otro", label: "Otro" },
] as const satisfies readonly Opcion[];
export type TipoMuestra = (typeof TIPOS_MUESTRA)[number]["value"];

/** Las cuatro casillas de "Ubicación" del papel. */
export const UBICACIONES = [
  { value: "superior", label: "Superior" },
  { value: "inferior", label: "Inferior" },
  { value: "derecho", label: "Derecho" },
  { value: "izquierdo", label: "Izquierdo" },
] as const satisfies readonly Opcion[];
export type Ubicacion = (typeof UBICACIONES)[number]["value"];

export const BORDES = [
  { value: "definidos", label: "Definidos" },
  { value: "indefinidos", label: "Indefinidos" },
  { value: "irregulares", label: "Irregulares" },
] as const satisfies readonly Opcion[];
export type Bordes = (typeof BORDES)[number]["value"];

export const COLORES = [
  { value: "hiperpigmentada", label: "Hiperpigmentada" },
  { value: "hipopigmentada", label: "Hipopigmentada" },
  { value: "aframbuesada", label: "Aframbuesada" },
  { value: "salmon", label: "Salmón" },
  { value: "negra", label: "Negra" },
  { value: "violacea", label: "Violácea" },
  { value: "amarilla", label: "Amarilla" },
  { value: "nacarada", label: "Nacarada" },
  { value: "blanca", label: "Blanca" },
  { value: "homogenea", label: "Homogénea" },
  { value: "heterogenea", label: "Heterogénea" },
] as const satisfies readonly Opcion[];
export type Color = (typeof COLORES)[number]["value"];

export const TAMANOS = [
  { value: "menor_0_5mm", label: "< 0,5 mm" },
  { value: "0_5_1mm", label: "0,5-1 mm" },
  { value: "1_2mm", label: "1-2 mm" },
  { value: "2_5mm", label: "2-5 mm" },
  { value: "otro", label: "Otro" },
] as const satisfies readonly Opcion[];
export type Tamano = (typeof TAMANOS)[number]["value"];

export const ALTURAS = [
  { value: "plana", label: "Plana" },
  { value: "sobreelevada", label: "Sobreelevada" },
  { value: "ulcerada", label: "Ulcerada" },
  { value: "pediculada", label: "Pediculada" },
] as const satisfies readonly Opcion[];
export type Altura = (typeof ALTURAS)[number]["value"];

export const CAMBIOS_ASOCIADOS = [
  { value: "descamacion", label: "Descamación" },
  { value: "queratosis", label: "Queratosis" },
  { value: "telangiectasias", label: "Telangiectasias" },
] as const satisfies readonly Opcion[];
export type CambioAsociado = (typeof CAMBIOS_ASOCIADOS)[number]["value"];

/** Estudios de imágenes del paciente (sección 1 del formulario). */
export const ESTUDIOS_IMAGENES = [
  { value: "rx", label: "RX" },
  { value: "tc", label: "TC" },
  { value: "rm", label: "RM" },
  { value: "eco", label: "ECO" },
] as const satisfies readonly Opcion[];
export type EstudioImagen = (typeof ESTUDIOS_IMAGENES)[number]["value"];

/** Etiqueta de un valor, o el valor tal cual si no está en la lista. */
export function etiqueta(lista: readonly Opcion[], value?: string): string | undefined {
  if (!value) return undefined;
  return lista.find((o) => o.value === value)?.label ?? value;
}

/** Etiquetas de varios valores, unidas por coma. */
export function etiquetas(lista: readonly Opcion[], values: readonly string[]): string {
  return values.map((v) => etiqueta(lista, v) ?? v).join(", ");
}

/** Deja solo los valores que están en la lista (para leer del servidor). */
export function soloConocidos<V extends string>(
  lista: readonly Opcion<V>[],
  values?: readonly string[] | null
): V[] {
  const validos = new Set<string>(lista.map((o) => o.value));
  return (values ?? []).filter((v): v is V => validos.has(v));
}
