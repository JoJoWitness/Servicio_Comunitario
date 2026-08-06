/**
 * Hooks de TanStack Query para autenticación.
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
import { isApiError } from "../api/errors";
import { useSessionStore } from "../stores/sessionStore";

export const authKeys = {
  session: ["session"] as const,
};

/**
 * Confirma en el backend que la sesión (cookie) sigue activa.
 * Requisito 4.1 — GET /auth/validateUser
 *
 * El backend devuelve 200 sin body si la sesión es válida, 401 si expiró.
 * El perfil se obtiene del store persistido en localStorage, no de esta respuesta.
 */
export function useValidateUser() {
  const setPerfil = useSessionStore((s) => s.setPerfil);

  return useQuery({
    queryKey: authKeys.session,
    queryFn: async () => {
      await validateUser();
      const perfil = useSessionStore.getState().perfil;
      if (!perfil) {
        throw new Error("Sesión válida en backend pero sin perfil en localStorage");
      }
      setPerfil(perfil);
      return perfil;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
    retry: (failureCount, error) => {
      if (isApiError(error) && error.status === 401) return false;
      if (!isApiError(error)) return false;
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    throwOnError: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const setPerfil = useSessionStore((s) => s.setPerfil);

  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (perfil) => {
      setPerfil(perfil);
      queryClient.setQueryData(authKeys.session, perfil);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const limpiar = useSessionStore((s) => s.limpiar);

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      limpiar();
      queryClient.clear();
    },
    onError: () => {
      limpiar();
      queryClient.clear();
    },
  });
}

export function useCambiarPassword() {
  return useMutation({
    mutationFn: ({ actual, nueva }: { actual: string; nueva: string }) =>
      cambiarPassword(actual, nueva),
  });
}
