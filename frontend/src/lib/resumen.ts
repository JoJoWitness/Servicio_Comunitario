/**
 * Composición del resumen de la intervención.
 *
 * El análisis de las notas del servicio (`docs/catalogo-clinico.md` §1.4)
 * encontró que el relato siempre sigue siete bloques en el mismo orden:
 *
 *   1. anestesia · 2. asepsia · 3. montaje · 4. preparación
 *   5. ⇢ pasos propios del procedimiento ⇠
 *   6. cierre · 7. desenlace
 *
 * Los bloques 1-4 y 6-7 son plantilla; lo único que distingue una nota de otra
 * es el bloque 5. De ahí las dos operaciones de este módulo:
 *
 * - `aplicarHuecos` resuelve la frase de una técnica con los valores que el
 *   médico responde para esa cirugía concreta.
 * - `insertarFrase` la coloca al final del bloque 5, es decir, justo antes del
 *   cierre, en vez de al final del texto.
 */

import type { Hueco } from "@/domain/models";

/**
 * Primer fragmento del bloque de cierre. `insertarFrase` busca el primero que
 * aparezca para saber dónde termina el relato de los pasos.
 */
const INICIOS_DE_CIERRE = [
  // El verbo va primero para que el corte no parta la frase por la mitad
  // ("se administra, …, antibiótico subconjuntival").
  "se administra antibiótico",
  "se administra antibiotico",
  "antibiótico subconjuntival",
  "antibiotico subconjuntival",
  "antibiótico tópico",
  "antibiotico topico",
  "parchado ocular",
  "acto culminado",
];

/**
 * Sustituye cada marcador `{nombre}` de la frase por el valor indicado.
 * Un marcador sin valor se queda con el `default` del hueco, y si tampoco lo
 * hay se elimina junto al espacio que lo precede, para no dejar llaves sueltas
 * en la nota.
 *
 * @example
 * aplicarHuecos("se abre puerto principal en H{hora}", [{nombre:"hora",default:"12"}], {})
 * // "se abre puerto principal en H12"
 */
export function aplicarHuecos(
  frase: string,
  huecos: Hueco[] | undefined,
  valores: Record<string, string>
): string {
  const porDefecto = new Map((huecos ?? []).map((h) => [h.nombre, h.default]));

  return frase
    .replace(/\{(\w+)\}/g, (_, nombre: string) => {
      const valor = valores[nombre]?.trim();
      if (valor) return valor;
      return porDefecto.get(nombre)?.trim() ?? "";
    })
    // Un hueco sin valor ni default deja un espacio doble o un espacio antes
    // de la coma; se limpian aquí.
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .trim();
}

/**
 * Inserta una frase en el resumen respetando el esqueleto: si el texto ya
 * tiene bloque de cierre, la frase entra justo antes; si no, se añade al final.
 * Devuelve el resumen sin tocar cuando la frase ya está presente, para que
 * pulsar dos veces no duplique el paso.
 *
 * @example
 * insertarFrase("Bajo anestesia local, parchado ocular.", "se abre puerto en H12")
 * // "Bajo anestesia local, se abre puerto en H12, parchado ocular."
 */
export function insertarFrase(resumen: string, frase: string): string {
  const limpia = frase.trim().replace(/[.,;]+$/, "");
  if (!limpia) return resumen;

  const base = resumen.trim();
  if (!base) return capitalizar(limpia) + ".";
  if (base.toLowerCase().includes(limpia.toLowerCase())) return resumen;

  const corte = posicionDeCierre(base);
  if (corte === -1) {
    // Sin bloque de cierre: la frase va al final, antes del punto si lo hay.
    const sinPunto = base.replace(/\.\s*$/, "");
    return `${sinPunto}, ${limpia}.`;
  }

  const antes = base.slice(0, corte).replace(/[\s,]+$/, "");
  const despues = base.slice(corte);
  return `${antes}, ${limpia}, ${despues}`;
}

/**
 * Índice donde empieza el bloque de cierre, o -1 si el resumen no lo tiene.
 */
function posicionDeCierre(resumen: string): number {
  const enMinusculas = resumen.toLowerCase();
  let posicion = -1;

  for (const marca of INICIOS_DE_CIERRE) {
    const i = enMinusculas.indexOf(marca);
    if (i !== -1 && (posicion === -1 || i < posicion)) posicion = i;
  }

  return posicion;
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Valores iniciales de los huecos de una técnica: cada uno arranca con su
 * `default`, que es lo que el servicio usa en la mayoría de las cirugías.
 */
export function valoresPorDefecto(huecos: Hueco[] | undefined): Record<string, string> {
  return Object.fromEntries((huecos ?? []).map((h) => [h.nombre, h.default ?? ""]));
}
