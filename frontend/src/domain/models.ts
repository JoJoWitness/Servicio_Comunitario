/**
 * Modelos de dominio limpios del frontend.
 * Ningún componente, hook ni store fuera de la Capa_API debe importar tipos del DTO.
 * Los nombres con typos del backend (anestia, Id_paciente, etc.) existen solo en api/dto/*.
 */

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------
export type Rol = "admin" | "medico" | "secretaria";

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
  direccion?: string;
  eliminado: boolean;
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

  // --- Campos pendientes de soporte en el backend (Requisito 24) ---
  /** @backendDependency Requisito 24.1 — no enviar hasta que BACKEND_SUPPORTS_OJO_ESTADO = true */
  ojo?: Ojo;
  /** @backendDependency Requisito 24.2 — no enviar hasta que BACKEND_SUPPORTS_OJO_ESTADO = true */
  estado?: EstadoNota;
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
}
