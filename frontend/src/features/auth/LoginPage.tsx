/**
 * Pantalla de inicio de sesión.
 * Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLogin, useLoginOffline } from "@/hooks/useAuth";
import { isApiError, isRedError } from "@/api/errors";
import { correoRecordado } from "@/offline/credencialLocal";
import { haySinConexion, useConexionStore } from "@/stores/conexionStore";
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
// Cuentas de prueba (solo en desarrollo)
// ---------------------------------------------------------------------------

const CUENTAS_PRUEBA: {
  correo: string;
  contrasena: string;
  rol: string;
  label: string;
}[] = [
  { correo: "roma@test.com",   contrasena: "roma2026",   rol: "medico",     label: "Médico" },
  { correo: "canela@test.com", contrasena: "canela2026", rol: "secretaria", label: "Secretario" },
  { correo: "ryuk@test.com",   contrasena: "ryuk2026",   rol: "admin",      label: "Admin" },
];

const ROL_BADGE: Record<string, "secondary" | "outline" | "default"> = {
  medico:     "secondary",
  secretaria: "outline",
  admin:      "default",
};

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from?.pathname;

  const { mutate: login, isPending } = useLogin();
  const { mutateAsync: loginOffline, isPending: verificandoLocal } = useLoginOffline();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sinConexion = useConexionStore((s) => s.estado) === "sin-conexion";
  const despertando = useConexionStore((s) => s.despertando);
  const despertar = useConexionStore((s) => s.despertar);
  const correoGuardado = correoRecordado();

  // El servidor puede estar dormido, no caído: el hosting lo apaga tras un rato
  // sin visitas y tarda cerca de un minuto en volver. Se ofrece esperarlo en vez
  // de dejar al médico frente a un "sin conexión" que no explica nada.
  const [falloDespertar, setFalloDespertar] = useState(false);

  const intentarDespertar = async () => {
    setFalloDespertar(false);
    const despierto = await despertar();
    if (!despierto) setFalloDespertar(true);
  };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
  });

  // Entra con la credencial guardada la última vez que sí hubo servidor. Es lo
  // que permite abrir la aplicación en un quirófano sin señal.
  const entrarOffline = async (data: LoginFormValues) => {
    try {
      const perfil = await loginOffline({
        correo: data.correo,
        contrasena: data.contrasena,
      });
      navigate(from ?? rutaInicialPorRol(perfil.rol), { replace: true });
    } catch (errorLocal) {
      setErrorMsg(
        errorLocal instanceof Error
          ? errorLocal.message
          : "No se pudo entrar sin conexión."
      );
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    setErrorMsg(null);

    // Si ya sabemos que no hay servidor, NO se intenta la red: ese intento se
    // cuelga (el fetch se queda esperando y nunca falla), dejando el botón en
    // "Iniciando sesión..." para siempre. Se va directo al login local, igual
    // que hacen crear-nota y crear-paciente al detectar que no hay conexión.
    if (haySinConexion()) {
      await entrarOffline(data);
      return;
    }

    login(
      { correo: data.correo, contrasena: data.contrasena },
      {
        onSuccess: (perfil) => {
          navigate(from ?? rutaInicialPorRol(perfil.rol), { replace: true });
        },
        onError: async (err) => {
          if (isApiError(err) && err.status === 401) {
            setErrorMsg("Correo o contraseña incorrectos.");
            return;
          }

          // El fetch falló de verdad (sin red) o la red se cayó justo ahora:
          // se cae al login local en vez de dar un error de servidor.
          if (isRedError(err) || haySinConexion()) {
            await entrarOffline(data);
            return;
          }

          setErrorMsg("Error al iniciar sesión. Intenta de nuevo.");
        },
      }
    );
  };

  const rellenarCuenta = (correo: string, contrasena: string) => {
    setValue("correo", correo, { shouldValidate: true });
    setValue("contrasena", contrasena, { shouldValidate: true });
    setErrorMsg(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-3">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
            <CardDescription>
              Notas Operatorias - Servicio de Oftalmología HCSC
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

            {/* Sin conexión: se explica de entrada quién puede entrar y quién
                no, en vez de dejar que lo descubra fallando. */}
              {sinConexion && (
                <Alert role="status">
                  <WifiOff className="h-4 w-4" />
                  <AlertDescription>
                    {correoGuardado ? (
                      <>
                        Sin conexión con el servidor. Puedes entrar con la
                        contraseña de <strong>{correoGuardado}</strong>, la
                        última cuenta que inició sesión en este equipo.
                      </>
                    ) : (
                      <>
                        Sin conexión con el servidor. Este equipo todavía no
                        tiene ninguna sesión guardada, así que hay que
                        conectarse al menos una vez para poder entrar sin red.
                      </>
                    )}

                    {/*
                      El servidor se apaga solo cuando lleva un rato sin
                      visitas, y la primera petición lo enciende. La aplicación
                      ya lo está intentando por su cuenta; aquí solo se cuenta
                      lo que está pasando, y el botón queda para quien no
                      quiera esperar al siguiente intento.
                    */}
                    <div className="mt-3 space-y-2">
                      {despertando ? (
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
                          Despertando el servidor… puede tardar hasta un
                          minuto, se apaga cuando nadie lo usa.
                        </p>
                      ) : (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void intentarDespertar()}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reintentar ahora
                          </Button>
                          {falloDespertar && (
                            <p className="text-xs text-muted-foreground">
                              Sigue sin responder. Revisa que este equipo tenga
                              internet.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </AlertDescription>
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
                <PasswordInput
                  id="contrasena"
                  autoComplete="current-password"
                  aria-describedby={errors.contrasena ? "contrasena-error" : undefined}
                  {...register("contrasena")}
                />
                {errors.contrasena && (
                  <p id="contrasena-error" className="text-sm text-destructive">
                    {errors.contrasena.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isPending || verificandoLocal}
              >
                {verificandoLocal
                  ? "Verificando en este equipo..."
                  : isPending
                    ? "Iniciando sesión..."
                    : "Iniciar sesión"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Panel de cuentas de prueba — solo en desarrollo */}
        {import.meta.env.DEV && (
          <Card className="border-dashed border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/20">
            <CardContent className="pt-4 pb-3 space-y-2">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                Cuentas de prueba
              </p>
              <Separator className="opacity-40" />
              <div className="space-y-1.5">
                {CUENTAS_PRUEBA.map((cuenta) => (
                  <button
                    key={cuenta.correo}
                    type="button"
                    onClick={() => rellenarCuenta(cuenta.correo, cuenta.contrasena)}
                    className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm text-left hover:bg-amber-100/70 dark:hover:bg-amber-900/30 transition-colors"
                    aria-label={`Usar cuenta de ${cuenta.label}: ${cuenta.correo}`}
                  >
                    <span className="text-muted-foreground truncate">{cuenta.correo}</span>
                    <Badge variant={ROL_BADGE[cuenta.rol]} className="ml-2 shrink-0 text-xs">
                      {cuenta.label}
                    </Badge>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/70 pt-1">
                Solo visible en desarrollo. Click rellena el formulario.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
