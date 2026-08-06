/**
 * Hook de debounce genérico.
 * Retrasa la actualización de un valor hasta que el usuario deje de escribir.
 */

import { useEffect, useState } from "react";

/**
 * Devuelve el valor de `value` pero solo lo actualiza después de que hayan
 * pasado `delay` milisegundos sin que cambie.
 *
 * @param value  Valor a debouncear
 * @param delay  Tiempo de espera en milisegundos (default: 500)
 */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
