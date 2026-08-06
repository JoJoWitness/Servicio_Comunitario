/**
 * Hooks de TanStack Query para autenticación.
 *
 * - `useValidateUser`  → rehidratación de sesión al iniciar la app
 * - `useLogin`         → mutación de login
 * - `useLogout`        → mutación de logout
 * - `useCambiarPassword` → mutación de cambio de contraseña
 *
 * Requisitos: 3.2, 4.1, 6.1, 8.2
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cambiarPassword,
  login,
  logout,
  validateUser,
  type LoginInput,
} from "../api/endpoints/auth";
import { useSessionStore } from "../stores/sessionStore";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const authKeys = {
  session: ["session"] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Valida la sesión existente en el arranque de la app.
 * Requisito 4.1 — GET /auth/validateUser
 *
 * El componente raíz llama a este hook; mientras `isPending` es true se muestra
 * el estado de carga (Requisito 4.4). El resultado se refleja en el Store_Sesion
 * mediante los callbacks `onSuccess`/`onError`.
 */
export function useValidateUser() {
  const setPerfil = useSessionStore((s) => s.setPerfil);
  const limpiar = useSessionStore((s) => s.limpiar);

  return useQuery({
    queryKey: authKeys.session,
    queryFn: async () => {
      try {
        const perfil = await validateUser();
        setPerfil(perfil);
        return perfil;
      } catch {
        limpiar();
        return null;
      }
    },
    // Solo ejecutar una vez al montar; no refetch periódico de sesión
    staleTime: Infinity,
    retry: false,
  });
}

/**
 * Mutación de inicio de sesión.
 * Requisito 3.2 — POST /auth/login
 *
 * En éxito: actualiza el Store_Sesion con el perfil.
 * En 401: lanza ApiError para que el componente muestre el mensaje (Req 3.5).
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const setPerfil = useSessionStore((s) => s.setPerfil);

  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (perfil) => {
      setPerfil(perfil);
      // Invalida la query de sesión para reflejar el nuevo estado
      queryClient.setQueryData(authKeys.session, perfil);
    },
  });
}

/**
 * Mutación de cierre de sesión.
 * Requisito 6.1 — POST /auth/logout
 *
 * En éxito: limpia el Store_Sesion y borra todo el caché de TanStack Query.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const limpiar = useSessionStore((s) => s.limpiar);

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      limpiar();
      // Limpiar todo el caché al cerrar sesión para no filtrar datos entre sesiones
      queryClient.clear();
    },
    onError: () => {
      // Limpiar sesión localmente aunque el backend falle
      limpiar();
      queryClient.clear();
    },
  });
}

/**
 * Mutación de cambio de contraseña.
 * Requisito 8.2 — PUT /usuarios/me/password
 */
export function useCambiarPassword() {
  return useMutation({
    mutationFn: ({
      actual,
      nueva,
    }: {
      actual: string;
      nueva: string;
    }) => cambiarPassword(actual, nueva),
  });
}
