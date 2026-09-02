/**
 * Estado administrativo de una nota: el interruptor de legalización, en un
 * solo bloque bajo el encabezado del detalle.
 *
 * Responde, antes de que nadie haga clic, las dos preguntas que hasta ahora
 * solo contestaba un 403: ¿esta nota ya pasó por legalización? y ¿todavía se
 * puede corregir? El veredicto de fondo (`puedeEditar`) lo calcula el
 * servidor; aquí se explica en palabras y se pinta el botón acorde.
 */

import { useState } from "react";
import { Lock, Stamp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCambiarLegalizacion } from "@/hooks/useNotas";
import { useTodosLosUsuarios } from "@/hooks/useUsuarios";
import { useSessionStore } from "@/stores/sessionStore";
import { useConexionStore } from "@/stores/conexionStore";
import { clasificar403Nota, isApiError } from "@/api/errors";
import { cn } from "@/lib/utils";
import type { Nota, Usuario } from "@/domain/models";

// ---------------------------------------------------------------------------
// Reglas compartidas con el detalle y el formulario
// ---------------------------------------------------------------------------

/**
 * Por qué una nota no admite cambios ahora, en una frase para el `title` del
 * botón deshabilitado. `null` cuando sí se puede.
 */
export function motivoBloqueo(nota: Nota): string | null {
  if (nota.legalizada) {
    return "La nota está legalizada. Desactiva la legalización para modificarla.";
  }
  if (nota.puedeEditar) return null;
  return "Solo el equipo quirúrgico de esta nota (o un administrador) puede modificarla.";
}

/** Quién puede tocar el interruptor de legalización, según la sesión. */
export function puedeLegalizar(nota: Nota, perfil: Usuario | null | undefined): boolean {
  if (!perfil) return false;
  // Admin y secretaria (que suele llevar el trámite) sobre cualquier nota; el
  // médico solo sobre las suyas. Es la misma regla que aplica el servidor.
  if (perfil.rol === "admin" || perfil.rol === "secretaria") return true;
  return nota.medicos.some((m) => m.id === perfil.id);
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function EstadoNota({ nota }: { nota: Nota }) {
  const perfil = useSessionStore((s) => s.perfil);
  const sinConexion = useConexionStore((s) => s.estado) === "sin-conexion";
  const { data: usuarios } = useTodosLosUsuarios();
  const { mutate: cambiar, isPending } = useCambiarLegalizacion(nota.id ?? 0);
  const [error, setError] = useState<string | null>(null);

  const conPermiso = puedeLegalizar(nota, perfil);
  const deshabilitado = !conPermiso || sinConexion || isPending || nota.id === undefined;
  const motivoSwitch = !conPermiso
    ? "Solo el equipo quirúrgico, la secretaría o un administrador puede legalizar"
    : sinConexion
      ? "Requiere conexión"
      : undefined;

  const quienLegalizo = (() => {
    if (!nota.legalizadaPor) return null;
    const u =
      usuarios?.find((x) => x.id === nota.legalizadaPor) ??
      nota.medicos.find((m) => m.id === nota.legalizadaPor);
    return u ? `${u.nombres} ${u.apellidos}`.trim() : null;
  })();

  const alternar = (valor: boolean) => {
    setError(null);
    cambiar(valor, {
      onError: (err) => {
        if (isApiError(err) && err.status === 403) {
          const motivo = clasificar403Nota(err.body, err.motivo);
          setError(
            motivo === "no_participante"
              ? "No puedes legalizar esta nota porque no participaste en la intervención."
              : err.body || "No se pudo cambiar la legalización."
          );
        } else {
          setError("No se pudo cambiar la legalización. Intenta de nuevo.");
        }
      },
    });
  };

  // ── Texto de estado ── (ya no hay plazo de edición: solo la legalización
  // bloquea los cambios)
  const plazo = nota.legalizada
    ? {
        texto: "Bloqueada por legalización: no se puede editar ni eliminar.",
        clase: "text-muted-foreground",
        icono: <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      }
    : null;

  const soloEquipo =
    !nota.legalizada &&
    !nota.puedeEditar &&
    (perfil?.rol === "medico" || perfil?.rol === "admin");

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Stamp
              className={cn(
                "h-4 w-4",
                nota.legalizada ? "text-primary" : "text-muted-foreground"
              )}
              aria-hidden
            />
            <Label htmlFor="switch-legalizada" className="text-sm font-medium">
              Legalizada
            </Label>
          </div>
          <div title={motivoSwitch}>
            <Switch
              id="switch-legalizada"
              checked={nota.legalizada}
              onCheckedChange={alternar}
              disabled={deshabilitado}
              aria-label="Marcar la nota como legalizada"
            />
          </div>
        </div>

        {nota.legalizada && nota.legalizadaEn && (
          <p className="text-xs text-muted-foreground">
            Legalizada{quienLegalizo ? ` por ${quienLegalizo}` : ""} el{" "}
            {nota.legalizadaEn.toLocaleString("es-VE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </p>
        )}

        {plazo && (
          <p className={cn("flex items-center gap-1.5 text-xs", plazo.clase)} role="status">
            {plazo.icono}
            {plazo.texto}
          </p>
        )}

        {soloEquipo && (
          <p className="text-xs text-muted-foreground">
            Solo el equipo quirúrgico de esta nota puede editarla.
          </p>
        )}

        {error && (
          <Alert variant="destructive" role="alert" className="text-sm">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
