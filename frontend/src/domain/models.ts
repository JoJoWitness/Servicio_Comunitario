/**
 * Modelos de dominio limpios del frontend.
 * Ningún componente, hook ni store fuera de la Capa_API debe importar tipos del DTO.
 * Los nombres con typos del backend (anestia, Id_paciente, etc.) existen solo en api/dto/*.
 */

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------
export type Rol = "admin" | "medico" | "secretaria";

import type {
  Altura,
  Bordes,
  CambioAsociado,
  CentroToma,
  Color,
  EstudioImagen,
  Tamano,
  TipoBiopsia,
  TipoCitologia,
  TipoMuestra,
  Ubicacion,
} from "./catalogosBiopsia";

// ---------------------------------------------------------------------------
// Usuario
// ---------------------------------------------------------------------------
export interface Usuario {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: Rol;
}

// ---------------------------------------------------------------------------
// Paciente
// ---------------------------------------------------------------------------

/** Tipo de documento de identidad venezolano */
export type TipoDocumento = "V" | "E";

/** Género del paciente */
export type Genero = "M" | "F";

export interface Paciente {
  id: string;
  historiaMedica: string;
  tipoDocumento: TipoDocumento;
  numeroIdentificacion: string;
  nombre: string;
  genero: Genero;
  fechaNacimiento: Date;
  telefono?: string;
  /** Segundo teléfono; el papel de la solicitud de biopsia pide dos. */
  telefonoAlternativo?: string;
  direccion?: string;
  eliminado: boolean;
  /**
   * Antecedentes para la "Solicitud de biopsia o citología" (v0.5.0). Todos
   * opcionales; se imprimen en la sección 1 de la solicitud.
   */
  ocupacion?: string;
  raza?: string;
  antecedentesOncologicos?: string;
  quimioterapiaCiclos?: number;
  radioterapiaCiclos?: number;
  estudiosImagenes: EstudioImagen[];
  hallazgoEstudios?: string;
  /**
   * Si hay una imagen de la cédula guardada en el servidor. El binario nunca
   * viaja con el paciente: se pide aparte (`obtenerCedula`) y se imprime en la
   * hoja de la nota, abajo a la izquierda, donde antes se pegaba la fotocopia.
   */
  tieneCedula: boolean;
}

// ---------------------------------------------------------------------------
// Nota operatoria
// ---------------------------------------------------------------------------

/**
 * Campos `ojo` y `estado` son dependencias del backend pendientes (Requisito 24).
 * Se modelan aquí para estar listos, pero `notaToDto` los omite mientras la
 * bandera `BACKEND_SUPPORTS_OJO_ESTADO` esté en `false`.
 *
 * @see api/dto/nota.dto.ts — flag BACKEND_SUPPORTS_OJO_ESTADO
 */
export type Ojo = "OD" | "OI" | "AO";
export type EstadoNota = "realizada" | "diferida";

export interface Nota {
  id?: number;
  dxPreOperatorio: string;
  dxPostOperatorio: string;
  /** Nombre de dominio corregido; el DTO lo llama `intervencion_realizado` */
  intervencionRealizada: string;
  resumenIntervencion: string;
  /**
   * Comentarios libres del médico sobre la intervención. Se guardan aparte del
   * resumen, pero se leen como su cierre: al mostrar o exportar la nota van
   * concatenados al final, encabezados por "Observaciones:".
   *
   * @see lib/resumen.ts — `resumenConObservaciones`
   */
  comentarios?: string;
  fechaComienzo: Date;
  fechaCulminacion: Date;
  /** Formato "HH:mm" — la parte de fecha se ignora en el backend */
  horaComienzo: string;
  /** Formato "HH:mm" — la parte de fecha se ignora en el backend */
  horaCulminacion: string;
  pabellon: string;
  esElectiva: boolean;
  esEmergencia: boolean;
  tuvoBiopsia: boolean;
  /** Nombre de dominio corregido; el DTO lo llama `anestia` */
  anestesia: string;
  /** Nombre de dominio corregido; el DTO lo llama `Id_paciente` */
  idPaciente: string;
  medicoEncargado?: string;
  /**
   * En escritura (POST/PUT): array de UUIDs excluyendo al médico encargado.
   * Se deriva de `medicos[].id` al cargar una nota existente.
   */
  equipo: string[];
  /**
   * En lectura (GET): array de objetos Usuario completo para renderizar el equipo.
   * El backend lo devuelve como `medicos`.
   */
  medicos: Usuario[];

  // --- Estado administrativo (v0.4.0) ---
  /**
   * La nota impresa ya se firmó, selló y archivó. Es un interruptor aparte de
   * la edición: no pasa por el formulario, y mientras esté puesto la nota no
   * se puede corregir ni eliminar.
   */
  legalizada: boolean;
  legalizadaEn?: Date;
  /** UUID de quien puso la marca. */
  legalizadaPor?: string;
  /** Momento del registro en el servidor. */
  createdAt?: Date;
  /**
   * Veredicto del servidor para el usuario de la sesión: vigente, no
   * legalizada y admin o participante. Es lo que decide si "Editar" y
   * "Eliminar" aparecen habilitados antes de hacer clic.
   */
  puedeEditar: boolean;

  // --- Campos pendientes de soporte en el backend (Requisito 24) ---
  /** @backendDependency Requisito 24.1 — no enviar hasta que BACKEND_SUPPORTS_OJO_ESTADO = true */
  ojo?: Ojo;
  /** @backendDependency Requisito 24.2 — no enviar hasta que BACKEND_SUPPORTS_OJO_ESTADO = true */
  estado?: EstadoNota;
}

// ---------------------------------------------------------------------------
// Biopsias (v0.5.0)
// ---------------------------------------------------------------------------

/**
 * Ciclo de una muestra: se toma en quirófano, se envía a anatomía patológica,
 * llega el informe y se le comunica al paciente. Vive aparte de la nota
 * porque dura semanas y sigue cuando la nota ya está cerrada y legalizada.
 */
export type EstadoBiopsia = "tomada" | "enviada" | "con_resultado" | "entregada";

export const ESTADOS_BIOPSIA: EstadoBiopsia[] = [
  "tomada",
  "enviada",
  "con_resultado",
  "entregada",
];

/** `origen` es la cirugía que sacó la muestra; `seguimiento`, una reintervención. */
export type RolVinculoBiopsia = "origen" | "seguimiento";

export interface NotaVinculada {
  idNota: number;
  rol: RolVinculoBiopsia;
  fechaComienzo: Date;
  intervencion: string;
  vinculadaEn: Date;
}

export interface Biopsia {
  id?: number;
  /** UUID del dispositivo cuando se registró sin conexión. */
  clientUuid?: string;
  idPaciente: string;
  pacienteNombre?: string;
  idMedicoResponsable: string;
  medicoResponsable?: Usuario;
  ojo?: Ojo;
  tejido: string;
  descripcionMacroscopica: string;
  diagnosticoPresuntivo: string;
  fechaToma: Date;

  /**
   * Campos de la "Solicitud de biopsia o citología" (v0.5.0). Todos
   * opcionales: lo que no se cargue sale en blanco en la hoja para llenarlo a
   * mano. Los vocabularios están en `catalogosBiopsia.ts`.
   */
  tipoBiopsia?: TipoBiopsia;
  tipoCitologia?: TipoCitologia;
  centroToma: CentroToma;
  centroTomaOtro?: string;
  tipoMuestra?: TipoMuestra;
  tipoMuestraOtro?: string;
  ubicacion: Ubicacion[];
  bordes?: Bordes;
  color: Color[];
  colorOtro?: string;
  tamano?: Tamano;
  tamanoOtro?: string;
  altura?: Altura;
  cambiosAsociados: CambioAsociado[];
  /** `undefined`: no se preguntó. */
  tratamientosPrevios?: boolean;
  tratamientosPreviosCual?: string;

  laboratorio?: string;
  fechaEnvio?: Date;
  numeroPatologia?: string;
  resultado?: string;
  fechaResultado?: Date;
  fechaEntrega?: Date;
  estado: EstadoBiopsia;
  observaciones: string;
  createdAt?: Date;
  updatedAt?: Date;
  /** Notas a las que está ligada; siempre presente en las lecturas. */
  notas: NotaVinculada[];
  /** Puede cambiar los datos de la muestra (admin, responsable, participante). */
  puedeEditar: boolean;
  /** Puede marcarla enviada y cargar el resultado (incluye a secretaría). */
  puedeTramitar: boolean;
}

/** Filtros del listado de seguimiento (`GET /biopsias`). */
export interface FiltrosBiopsia {
  estados?: EstadoBiopsia[];
  medico?: string;
  paciente?: string;
  from?: string;
  to?: string;
  /** "yyyy-mm-dd": tomadas hasta esa fecha y todavía sin resultado. */
  sinResultadoDesde?: string;
}

// ---------------------------------------------------------------------------
// Catálogos clínicos
// ---------------------------------------------------------------------------
export interface Diagnostico {
  id: number;
  diagnostico: string;
  resumen?: string;
}

export interface Procedimiento {
  id: number;
  intervencion: string;
  resumen?: string;
}

/**
 * Valor que cambia de una cirugía a otra dentro de la frase de una técnica
 * (la hora del reloj, el número de puntos, el calibre). Se pide al médico y
 * sustituye al marcador `{nombre}` de la frase.
 */
export interface Hueco {
  nombre: string;
  default: string;
}

export interface Tecnica {
  id: number;
  tecnica: string;
  /**
   * Lo que la técnica aporta al resumen. El nombre corto no sirve para
   * redactar: "Apertura de puerto principal" es la etiqueta, mientras que
   * "se abre puerto principal en H{hora}" es lo que se escribe en la nota.
   */
  frase?: string;
  huecos?: Hueco[];
}

// ---------------------------------------------------------------------------
// Filtros y rangos para queries
// ---------------------------------------------------------------------------

/** Rango de fechas en formato RFC3339 (strings porque van a la URL) */
export interface RangoFechas {
  from?: string;
  to?: string;
}

/** Filtros para el listado global de notas (Requisito 19.2) */
export interface FiltrosNota {
  medico?: string;
  paciente?: string;
  from?: string;
  to?: string;
  /** Solo las legalizadas (`true`) o solo las pendientes (`false`). */
  legalizada?: boolean;
}
