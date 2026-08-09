/**
 * Baja por adelantado todo lo que hace falta para trabajar sin red. Sin esto el
 * espejo solo tendría lo que el médico hubiera abierto estando en línea.
 */

import {
  listarDiagnosticos,
  listarProcedimientos,
  listarTecnicas,
} from "@/api/endpoints/catalogos";
import { todosLosPacientes } from "@/api/endpoints/pacientes";
import { todosLosUsuarios } from "@/api/endpoints/usuarios";
import { reflejadoEn, type ClaveEspejo } from "./espejo";

const CLAVES: ClaveEspejo[] = [
  "catalogo:diagnosticos",
  "catalogo:procedimientos",
  "catalogo:tecnicas",
  "medicos",
  "pacientes",
];

/** A partir de aquí la copia se considera vieja. */
export const VIGENCIA_MS = 15 * 60 * 1000;

export interface ResumenPrecarga {
  diagnosticos: number;
  procedimientos: number;
  tecnicas: number;
  medicos: number;
  pacientes: number;
  fallos: string[];
}

let enCurso: Promise<ResumenPrecarga> | null = null;

export function precargarEspejo(): Promise<ResumenPrecarga> {
  if (enCurso) return enCurso;

  enCurso = ejecutar().finally(() => {
    enCurso = null;
  });

  return enCurso;
}

async function ejecutar(): Promise<ResumenPrecarga> {
  const fallos: string[] = [];

  // Cada colección por separado: que una falle no debe dejar sin actualizar
  // a las demás. Todas escriben el espejo por su cuenta.
  const bajar = async <T>(nombre: string, cargar: () => Promise<T[]>) => {
    try {
      return (await cargar()).length;
    } catch {
      fallos.push(nombre);
      return 0;
    }
  };

  const [diagnosticos, procedimientos, tecnicas, medicos, pacientes] = await Promise.all([
    bajar("diagnósticos", listarDiagnosticos),
    bajar("procedimientos", listarProcedimientos),
    bajar("técnicas", listarTecnicas),
    bajar("equipo quirúrgico", todosLosUsuarios),
    bajar("pacientes", todosLosPacientes),
  ]);

  return { diagnosticos, procedimientos, tecnicas, medicos, pacientes, fallos };
}

/** Antigüedad de la copia más vieja, o null si falta alguna colección. */
export async function precargadoEn(): Promise<number | null> {
  const marcas = await Promise.all(CLAVES.map(reflejadoEn));
  if (marcas.some((m) => m === null)) return null;
  return Math.min(...(marcas as number[]));
}

export async function precargarSiHaceFalta(): Promise<ResumenPrecarga | null> {
  const marca = await precargadoEn();
  if (marca !== null && Date.now() - marca < VIGENCIA_MS) return null;
  return precargarEspejo();
}
