/**
 * Cédula del paciente: adjuntar, ver, reemplazar y quitar la foto del
 * documento que se imprime en la hoja de la nota operatoria.
 *
 * La imagen es del paciente, no de la cirugía: se sube una vez y la usan todas
 * sus notas. Por eso este control vive tanto en la ficha del paciente como en
 * el formulario de nota, que es donde el médico está cuando se da cuenta de
 * que falta.
 *
 * Tres situaciones distintas por debajo del mismo botón:
 *
 * - **Paciente en el servidor, con red.** Sube por `PUT /pacientes/{id}/cedula`.
 * - **Paciente en el servidor, sin red.** Se deshabilita: no se encola la
 *   imagen sola en esta versión.
 * - **Paciente todavía en la cola local.** La imagen se guarda junto a él en
 *   IndexedDB y sube en el mismo lote de sincronización.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, IdCard, Loader2, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCedulaPaciente,
  useQuitarCedula,
  useSubirCedula,
} from "@/hooks/usePacientes";
import { pendientesKey, usePendientes } from "@/offline/useSincronizacion";
import { actualizarPendiente, type PacientePendiente } from "@/offline/outbox";
import { useConexionStore } from "@/stores/conexionStore";
import { useSessionStore } from "@/stores/sessionStore";
import { isApiError } from "@/api/errors";
import { ImagenInvalidaError, normalizarImagen } from "@/lib/imagen";
import type { Paciente } from "@/domain/models";

interface CedulaPacienteProps {
  paciente: Paciente;
  /** Compacto: sin título propio, para meterlo dentro de otra tarjeta. */
  compacto?: boolean;
}

export function CedulaPaciente({ paciente, compacto = false }: CedulaPacienteProps) {
  const perfil = useSessionStore((s) => s.perfil);
  const sinConexion = useConexionStore((s) => s.estado) === "sin-conexion";
  const queryClient = useQueryClient();

  // ¿Este paciente existe solo en este equipo todavía?
  const { data: pendientes = [] } = usePendientes();
  const pendiente = pendientes.find(
    (p): p is PacientePendiente => p.tipo === "paciente" && p.id === paciente.id
  );

  const puedeEscribir = perfil?.rol === "medico" || perfil?.rol === "admin";

  // Imagen del servidor (solo se pide si el paciente dice tenerla).
  const { data: cedulaServidor, isLoading } = useCedulaPaciente(
    paciente.id,
    !pendiente && paciente.tieneCedula
  );
  const { mutateAsync: subir, isPending: subiendo } = useSubirCedula(paciente.id);
  const { mutateAsync: quitar, isPending: quitando } = useQuitarCedula(paciente.id);

  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const imagen: Blob | null = pendiente
    ? pendiente.cedula?.blob ?? null
    : cedulaServidor ?? null;

  // URL de vista previa; se libera al cambiar la imagen o al desmontar.
  const urlPrevia = useMemo(
    () => (imagen ? URL.createObjectURL(imagen) : null),
    [imagen]
  );
  useEffect(() => {
    return () => {
      if (urlPrevia) URL.revokeObjectURL(urlPrevia);
    };
  }, [urlPrevia]);

  const ocupado = procesando || subiendo || quitando;
  const bloqueadoPorRed = !pendiente && sinConexion;
  const deshabilitado = !puedeEscribir || ocupado || bloqueadoPorRed;
  const motivo = !puedeEscribir
    ? "Solo el personal médico puede cambiar la cédula"
    : bloqueadoPorRed
      ? "Requiere conexión"
      : undefined;

  const alElegirArchivo = async (archivo: File | undefined) => {
    if (!archivo) return;
    setError(null);
    setProcesando(true);
    try {
      const reducida = await normalizarImagen(archivo);

      if (pendiente) {
        await actualizarPendiente({
          ...pendiente,
          cedula: { blob: reducida, contentType: reducida.type },
        });
        await queryClient.invalidateQueries({ queryKey: pendientesKey });
      } else {
        await subir(reducida);
      }
    } catch (err) {
      if (err instanceof ImagenInvalidaError) {
        setError(err.message);
      } else if (isApiError(err)) {
        setError(
          err.status === 413
            ? "La imagen sigue pesando demasiado. Prueba con una foto más pequeña."
            : err.status === 400
              ? "El archivo debe ser una imagen JPEG, PNG o WebP."
              : err.body || "No se pudo guardar la cédula."
        );
      } else {
        setError("No se pudo guardar la cédula. Intenta de nuevo.");
      }
    } finally {
      setProcesando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const alQuitar = async () => {
    setError(null);
    setConfirmarQuitar(false);
    try {
      if (pendiente) {
        await actualizarPendiente({ ...pendiente, cedula: undefined });
        await queryClient.invalidateQueries({ queryKey: pendientesKey });
      } else {
        await quitar();
      }
    } catch {
      setError("No se pudo quitar la cédula. Intenta de nuevo.");
    }
  };

  return (
    <div className={compacto ? "space-y-2" : "space-y-3"}>
      {!compacto && (
        <div className="flex items-center gap-2">
          <IdCard className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-medium">Cédula del paciente</h3>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {/* Vista previa, a proporción de carnet */}
        <div className="flex aspect-[1.586] w-full max-w-[16rem] items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted/30 sm:w-56">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Cargando cédula" />
          ) : urlPrevia ? (
            <img
              src={urlPrevia}
              alt={`Cédula de ${paciente.nombre}`}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="px-3 text-center text-xs text-muted-foreground">
              Sin cédula adjunta. La hoja se imprime con el espacio en blanco
              para pegar la fotocopia.
            </span>
          )}
        </div>

        {/* Acciones */}
        {puedeEscribir && (
          <div className="flex flex-wrap gap-2 sm:flex-col">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={(e) => void alElegirArchivo(e.target.files?.[0])}
              aria-hidden
              tabIndex={-1}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={deshabilitado}
              title={motivo}
              onClick={() => inputRef.current?.click()}
            >
              {ocupado ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              {ocupado ? "Guardando…" : imagen ? "Reemplazar" : "Adjuntar cédula"}
            </Button>
            {imagen && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={deshabilitado}
                title={motivo}
                onClick={() => setConfirmarQuitar(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Quitar
              </Button>
            )}
            {pendiente && (
              <p className="max-w-56 text-xs text-muted-foreground">
                Este paciente aún no está en el servidor: la cédula subirá con
                él en la próxima sincronización.
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" role="alert" className="text-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Dialog open={confirmarQuitar} onOpenChange={setConfirmarQuitar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Quitar la cédula?</DialogTitle>
            <DialogDescription>
              Se quitará la imagen de {paciente.nombre}. Todas sus notas
              operatorias volverán a imprimirse con el espacio en blanco.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarQuitar(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void alQuitar()}>
              Quitar cédula
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
