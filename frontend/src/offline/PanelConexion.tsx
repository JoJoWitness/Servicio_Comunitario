/**
 * Panel de conexión y pendientes — lo que el médico ve del trabajo sin red.
 *
 * Vive en la barra lateral y responde tres preguntas, en este orden de
 * importancia:
 *
 *   1. ¿Estoy grabando en el servidor o en este equipo?
 *   2. ¿Cuánto trabajo mío existe solo aquí?
 *   3. ¿Algo falló al subir, y por qué?
 *
 * La tercera es la que justifica el panel. La sincronización automática cubre
 * el caso feliz, pero una nota rechazada —un paciente con la historia médica
 * repetida, un médico dado de baja en el equipo— se quedaría muda para siempre
 * si no hubiera dónde verla. Aquí se ve, con el motivo que dio el servidor, y
 * se puede reintentar o descartar a sabiendas.
 */

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CloudUpload,
  Loader2,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useConexionStore } from "@/stores/conexionStore";
import { useSessionStore } from "@/stores/sessionStore";
import {
  useAccionesPendiente,
  usePendientes,
  useSincronizarAhora,
} from "./useSincronizacion";
import { useEstadoPrecarga, usePrecargarAhora } from "./usePrecarga";
import type { Pendiente } from "./outbox";

/** Descripción corta de un pendiente, para listarlo sin abrirlo. */
function describir(pendiente: Pendiente): string {
  if (pendiente.tipo === "paciente") {
    return `Paciente: ${pendiente.datos.nombre || "sin nombre"}`;
  }
  if (pendiente.tipo === "biopsia") {
    return `Biopsia: ${pendiente.datos.tejido || "sin tejido"}`;
  }
  const nota = pendiente.datos;
  return `Nota: ${nota.intervencionRealizada || nota.dxPreOperatorio || "sin título"}`;
}

/** Antigüedad en palabras. */
function hace(marca: number): string {
  const minutos = Math.floor((Date.now() - marca) / 60_000);
  if (minutos < 1) return "hace un momento";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.floor(horas / 24)} d`;
}

export function PanelConexion() {
  const estado = useConexionStore((s) => s.estado);
  const comprobar = useConexionStore((s) => s.comprobar);
  const despertar = useConexionStore((s) => s.despertar);
  const despertando = useConexionStore((s) => s.despertando);
  const modoSesion = useSessionStore((s) => s.modo);
  const { data: pendientes = [] } = usePendientes();
  const { mutate: sincronizar, isPending: sincronizando, data: resumen } =
    useSincronizarAhora();
  const { reintentar, descartar } = useAccionesPendiente();
  const { data: precargadoEn } = useEstadoPrecarga();
  const { mutate: precargar, isPending: precargando } = usePrecargarAhora();

  const [abierto, setAbierto] = useState(false);

  const sinConexion = estado === "sin-conexion";
  const conError = pendientes.filter((p) => p.estado === "error");
  const hayPendientes = pendientes.length > 0;

  return (
    <div className="px-3 py-2 space-y-2">
      {/* Estado de la conexión */}
      <button
        type="button"
        onClick={() => hayPendientes && setAbierto((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
          hayPendientes && "hover:bg-accent",
          sinConexion
            ? "text-amber-600 dark:text-amber-400"
            : "text-muted-foreground"
        )}
        aria-expanded={hayPendientes ? abierto : undefined}
      >
        {estado === "comprobando" ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : sinConexion ? (
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <Wifi className="h-3.5 w-3.5 shrink-0" />
        )}

        <span className="flex-1 text-left truncate">
          {estado === "comprobando"
            ? "Comprobando conexión..."
            : sinConexion
              ? "Sin conexión"
              : modoSesion === "offline"
                ? "En línea (sesión local)"
                : "En línea"}
        </span>

        {hayPendientes && (
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
              conError.length > 0
                ? "bg-destructive/15 text-destructive"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            )}
          >
            {pendientes.length}
          </span>
        )}
      </button>

      {/* Catálogos, equipo quirúrgico y pacientes guardados aquí. */}
      <div className="flex items-center gap-1 px-2">
        <span className="flex-1 text-[11px] leading-snug text-muted-foreground truncate">
          {precargadoEn
            ? `Datos sin conexión: ${hace(precargadoEn)}`
            : "Sin datos guardados para trabajar sin red"}
        </span>
        <button
          type="button"
          onClick={() => precargar()}
          disabled={precargando || sinConexion}
          title="Descargar catálogos, equipo quirúrgico y pacientes"
          aria-label="Actualizar los datos para trabajar sin conexión"
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <RefreshCw className={cn("h-3 w-3", precargando && "animate-spin")} />
        </button>
      </div>

      {/*
        Sin conexión y sin nada pendiente no hay nada que decir: el aviso de
        arriba ya lo explica todo y un panel vacío solo haría ruido.
      */}
      {hayPendientes && (
        <>
          <p className="px-2 text-[11px] leading-snug text-muted-foreground">
            {pendientes.length === 1
              ? "1 registro guardado solo en este equipo."
              : `${pendientes.length} registros guardados solo en este equipo.`}
          </p>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-xs h-8"
            onClick={() => sincronizar()}
            disabled={sincronizando || sinConexion}
          >
            {sincronizando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CloudUpload className="h-3.5 w-3.5" />
            )}
            {sincronizando ? "Subiendo..." : "Sincronizar ahora"}
          </Button>

          {/*
            Dos intentos distintos a propósito: reintentar es un vistazo rápido
            (¿volvió la red?), despertar es esperar de pie a que el servidor
            dormido termine de arrancar, que lleva cerca de un minuto.
          */}
          {sinConexion && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => void comprobar()}
                disabled={despertando}
                className="w-full px-2 text-left text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
              >
                Reintentar la conexión
              </button>
              <button
                type="button"
                onClick={() => void despertar()}
                disabled={despertando}
                className="w-full px-2 text-left text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
              >
                {despertando
                  ? "Despertando el servidor…"
                  : "Despertar el servidor"}
              </button>
            </div>
          )}

          {/* Resultado del último intento manual */}
          {resumen && !sincronizando && (
            <p
              className={cn(
                "px-2 text-[11px] leading-snug",
                resumen.fallidos > 0
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
              role="status"
            >
              {resumen.motivo
                ? `No se pudo subir: ${resumen.motivo}.`
                : `Subidos ${resumen.subidos}${
                    resumen.fallidos > 0 ? `, con ${resumen.fallidos} rechazados` : ""
                  }.`}
            </p>
          )}

          {abierto && (
            <>
              <Separator className="opacity-50" />
              <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                {pendientes.map((pendiente) => (
                  <li
                    key={pendiente.id}
                    className="rounded-md bg-muted/40 px-2 py-1.5 space-y-1"
                  >
                    <div className="flex items-start gap-1.5">
                      {pendiente.estado === "error" ? (
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-destructive" />
                      ) : (
                        <Check className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-[11px] leading-snug break-words">
                        {describir(pendiente)}
                      </span>
                    </div>

                    {pendiente.error && (
                      <p className="text-[10px] leading-snug text-destructive break-words pl-4.5">
                        {pendiente.error}
                      </p>
                    )}

                    {pendiente.estado === "error" && (
                      <div className="flex gap-1 pl-4.5">
                        <button
                          type="button"
                          onClick={() => void reintentar(pendiente.id)}
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          <RefreshCw className="h-2.5 w-2.5" />
                          Reintentar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Descartar destruye la única copia que existe de
                            // esa nota. Se pregunta siempre.
                            if (
                              window.confirm(
                                "Se eliminará de este equipo y no se subirá. No hay otra copia. ¿Continuar?"
                              )
                            ) {
                              void descartar(pendiente.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                          Descartar
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
