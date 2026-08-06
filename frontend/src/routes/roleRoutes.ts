/**
 * Helper de pantalla inicial por rol.
 *
 * Requisitos 3.4, 3.6, 3.7, 9.3:
 * - `medico`     → /mis-notas
 * - `secretaria` → /notas
 * - `admin`      → /notas
 *
 * Property 6: Para todo `Rol`, la pantalla inicial resuelta es "Mis notas"
 * si el rol es `medico`, y "Todas las notas" si el rol es `secretaria` o `admin`.
 */

import type { Rol } from "../domain/models";

/**
 * Devuelve la ruta inicial a la que se debe redirigir al usuario tras login
 * o cuando intenta acceder a una ruta para la que no tiene permiso.
 *
 * @param rol - Rol del usuario autenticado
 * @returns Ruta de la pantalla inicial para ese rol
 */
export function rutaInicialPorRol(rol: Rol): string {
  switch (rol) {
    case "medico":
      return "/mis-notas";
    case "secretaria":
    case "admin":
      return "/notas";
  }
}
