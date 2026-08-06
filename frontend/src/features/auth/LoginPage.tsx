/**
 * Pantalla de inicio de sesión.
 * Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLogin } from "@/hooks/useAuth";
import { isApiError } from "@/api/errors";
import { rutaInicialPorRol } from "@/routes/roleRoutes";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const LoginSchema = z.object({
  correo: z.string().email("Ingresa un correo válido"),
  contrasena: z.string().min(1, "La contraseña es obligatoria"),
});
type LoginFormValues = z.infer<typeof LoginSchema>;

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from?.pathname;

  const { mutate: login, isPending } = useLogin();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = (data: LoginFormValues) => {
    setErrorMsg(null);
    login(
      { correo: data.correo, contrasena: data.contrasena },
      {
        onSuccess: (perfil) => {
          // Redirigir a la ruta solicitada o a la pantalla inicial por rol
          navigate(from ?? rutaInicialPorRol(perfil.rol), { replace: true });
        },
        onError: (err) => {
          // Requisito 3.5: 401 → mensaje de credenciales inválidas, permanecer en login
          if (isApiError(err) && err.status === 401) {
            setErrorMsg("Correo o contraseña incorrectos.");
          } else {
            setErrorMsg("Error al iniciar sesión. Intenta de nuevo.");
          }
        },
      }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
          <CardDescription>
            Sistema de Notas Operatorias — HCSC Oftalmología
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Mensaje de error global */}
            {errorMsg && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            {/* Correo */}
            <div className="space-y-1">
              <Label htmlFor="correo">Correo electrónico</Label>
              <Input
                id="correo"
                type="email"
                autoComplete="email"
                aria-describedby={errors.correo ? "correo-error" : undefined}
                {...register("correo")}
              />
              {errors.correo && (
                <p id="correo-error" className="text-sm text-destructive">
                  {errors.correo.message}
                </p>
              )}
            </div>

            {/* Contraseña */}
            <div className="space-y-1">
              <Label htmlFor="contrasena">Contraseña</Label>
              <div className="relative">
                <Input
                  id="contrasena"
                  type={mostrarPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-describedby={errors.contrasena ? "contrasena-error" : undefined}
                  className="pr-10"
                  {...register("contrasena")}
                />
                <button
                  type="button"
                  aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                  onClick={() => setMostrarPassword((v) => !v)}
                >
                  {mostrarPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.contrasena && (
                <p id="contrasena-error" className="text-sm text-destructive">
                  {errors.contrasena.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
