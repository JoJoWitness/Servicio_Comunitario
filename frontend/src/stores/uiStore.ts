/**
 * Store de UI — estado de interfaz que no pertenece al servidor ni a la sesión.
 *
 * Actualmente gestiona:
 * - **Acciones deshabilitadas por plazo vencido** (Ventana_Edicion):
 *   Cuando una operación de edición/eliminación recibe un 403 clasificado
 *   como `fuera_de_plazo`, las acciones de esa nota se deshabilitan durante
 *   la sesión de visualización actual (Requisito 22.2).
 *   El estado se indexa por `id` de nota (número).
 *
 * Requisitos: 22.2
 */

import { create } from "zustand";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface UIState {
  /**
   * Conjunto de ids de notas cuyas acciones de edición/eliminación están
   * deshabilitadas porque recibieron un 403 de plazo vencido.
   * Se limpia al reiniciar la app (no persiste).
   */
  notasConPlazoPendiente: Set<number>;

  /**
   * Deshabilita las acciones de una nota al recibir un 403 `fuera_de_plazo`.
   * Requisito 22.2
   */
  deshabilitarAccionesNota: (notaId: number) => void;

  /**
   * Consulta si las acciones de una nota están deshabilitadas por plazo.
   * Usado por la vista de detalle para renderizar los botones deshabilitados.
   */
  accionesDeshabilitadas: (notaId: number) => boolean;

  /**
   * Limpia el estado de todas las notas deshabilitadas.
   * Útil al cambiar de sesión o navegar fuera del módulo de notas.
   */
  resetearAccionesNota: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUIStore = create<UIState>((set, get) => ({
  notasConPlazoPendiente: new Set(),

  deshabilitarAccionesNota: (notaId) =>
    set((state) => ({
      notasConPlazoPendiente: new Set(state.notasConPlazoPendiente).add(notaId),
    })),

  accionesDeshabilitadas: (notaId) =>
    get().notasConPlazoPendiente.has(notaId),

  resetearAccionesNota: () =>
    set({ notasConPlazoPendiente: new Set() }),
}));
