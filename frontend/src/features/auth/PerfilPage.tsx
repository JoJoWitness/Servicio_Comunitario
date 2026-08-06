/**
 * Página de perfil: muestra datos del usuario y formulario de cambio de contraseña.
 * Requisitos: 8.1–8.7
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useCambiarPassword } from "@/hooks/useAuth";
import { useSessionStore } from "@/stores/sessionStore";
import {
  ChangePasswordSchema,
  type ChangePasswordInput,
} from "@/domain/validation/password.validation";
import { isApiError } from "@/api/errors";

// ---------------------------------------------------------------------------
// Labels de rol para display
// ---------------------------------------------------------------------------

const ROL_LABEL: Record<string, string> = {
  admin: "Administrador",
  medico: "Médico",
  secretaria: "Secretaria",
};

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function PerfilPage() {
  const perfil = useSessionStore((s) => s.perfil);
  const { mutate: cambiarPassword, isPending } = useCambiarPassword();

  const [exito, setExito] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
  });

  const onSubmit = (data: ChangePasswordInput) => {
    setErrorMsg(null);
    setExito(false);
    cambiarPassword(
      { actual: data.actual, nueva: data.nueva },
      {
        onSuccess: () => {
          setExito(true);
          reset();
        },
        onError: (err) => {
          if (isApiError(err)) {
            if (err.status === 403) {
              // Requisito 8.6
              setErrorMsg("La contraseña actual no coincide.");
            } else if (err.status === 400) {
              // Requisito 8.7
              setErrorMsg(err.body || "Error de validación.");
            } else {
              setErrorMsg("Error al cambiar la contraseña.");
            }
          } else {
            setErrorMsg("Error inesperado. Intenta de nuevo.");
          }
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Perfil</h1>

        {/* Datos del usuario */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información de cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nombre</span>
              <span>{perfil ? `${perfil.nombres} ${perfil.apellidos}` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Correo</span>
              <span>{perfil?.correo ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Rol</span>
              <Badge variant="secondary">
                {perfil ? (ROL_LABEL[perfil.rol] ?? perfil.rol) : "—"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Cambio de contraseña */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cambiar contraseña</CardTitle>
            <CardDescription>La nueva contraseña debe tener al menos 8 caracteres.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {exito && (
                <Alert role="status">
                  <AlertDescription>Contraseña actualizada correctamente.</AlertDescription>
                </Alert>
              )}
              {errorMsg && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              {/* Contraseña actual */}
              <div className="space-y-1">
                <Label htmlFor="actual">Contraseña actual</Label>
                <div className="relative">
                  <Input
                    id="actual"
                    type={mostrarActual ? "text" : "password"}
                    autoComplete="current-password"
                    className="pr-10"
                    {...register("actual")}
                  />
                  <button
                    type="button"
                    aria-label={mostrarActual ? "Ocultar" : "Mostrar"}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                    onClick={() => setMostrarActual((v) => !v)}
                  >
                    {mostrarActual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.actual && (
                  <p className="text-sm text-destructive">{errors.actual.message}</p>
                )}
              </div>

              {/* Contraseña nueva */}
              <div className="space-y-1">
                <Label htmlFor="nueva">Contraseña nueva</Label>
                <div className="relative">
                  <Input
                    id="nueva"
                    type={mostrarNueva ? "text" : "password"}
                    autoComplete="new-password"
                    className="pr-10"
                    {...register("nueva")}
                  />
                  <button
                    type="button"
                    aria-label={mostrarNueva ? "Ocultar" : "Mostrar"}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                    onClick={() => setMostrarNueva((v) => !v)}
                  >
                    {mostrarNueva ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.nueva && (
                  <p className="text-sm text-destructive">{errors.nueva.message}</p>
                )}
              </div>

              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : "Cambiar contraseña"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
