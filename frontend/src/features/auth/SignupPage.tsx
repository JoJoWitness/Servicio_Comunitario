/**
 * Página de confirmación de registro por token de invitación.
 * Requisitos: 9.2, 9.3, 9.4
 *
 * El backend envía un correo con un enlace a:
 * http://localhost:4321/signup/<token>
 *
 * Al abrirse esta ruta, se dispara automáticamente POST /auth/signup/{token}.
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { confirmarRegistro } from "@/api/endpoints/auth";
import { useSessionStore } from "@/stores/sessionStore";
import { rutaInicialPorRol } from "@/routes/roleRoutes";
import { isApiError } from "@/api/errors";

export default function SignupPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const setPerfil = useSessionStore((s) => s.setPerfil);

  const [estado, setEstado] = useState<"cargando" | "error">("cargando");
  const [mensajeError, setMensajeError] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setMensajeError("Token inválido o ausente.");
      setEstado("error");
      return;
    }

    // Requisito 9.2: POST /auth/signup/{token} sin cuerpo al abrir la ruta
    confirmarRegistro(token)
      .then((perfil) => {
        // Requisito 9.3: en éxito, cargar perfil y redirigir por rol
        setPerfil(perfil);
        navigate(rutaInicialPorRol(perfil.rol), { replace: true });
      })
      .catch((err) => {
        // Requisito 9.4: mostrar el mensaje de error del backend
        const msg = isApiError(err)
          ? err.body || "Token inválido o ya utilizado."
          : "Error al confirmar el registro.";
        setMensajeError(msg);
        setEstado("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (estado === "cargando") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Confirmando registro...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Registro por invitación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive" role="alert">
            <AlertDescription>{mensajeError}</AlertDescription>
          </Alert>
          <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
            Volver al inicio de sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
