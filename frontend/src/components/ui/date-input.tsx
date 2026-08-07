/**
 * Campo de fecha con formato dd/mm/aa.
 *
 * Sustituye a `<input type="date">`, cuyo formato lo impone el locale del
 * navegador (mm/dd/yyyy en locales en-US) y cuyo icono de calendario nativo
 * es ilegible sobre fondos oscuros.
 *
 * - El valor que entra y sale (`value` / `onChange`) es ISO "yyyy-mm-dd",
 *   igual que el input nativo, para no tocar la lógica que ya lo consume.
 * - Lo que se muestra y escribe es "dd/mm/aa" con máscara automática.
 * - El calendario se dibuja con los tokens del tema, por lo que respeta
 *   claro/oscuro.
 */

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  aplicarMascaraFechaCorta,
  fechaCortaAISO,
  isoAFechaCorta,
} from "@/lib/datetime";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Cabecera de la cuadrícula, con la semana empezando en lunes. */
const DIAS_SEMANA = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];

/** Descompone un ISO "yyyy-mm-dd" en números, sin pasar por `Date` local. */
function partesISO(iso: string): { anio: number; mes: number; dia: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return null;
  return { anio: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
}

function aISO(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Índice del día de la semana con lunes = 0. */
function diaSemanaLunes(anio: number, mes: number, dia: number): number {
  return (new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay() + 6) % 7;
}

function diasEnMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

export interface DateInputProps
  extends Omit<
    React.ComponentPropsWithoutRef<"input">,
    "value" | "onChange" | "type"
  > {
  /** Fecha en ISO "yyyy-mm-dd", o cadena vacía si no hay fecha. */
  value?: string;
  /** Recibe ISO "yyyy-mm-dd", o cadena vacía si el campo queda incompleto. */
  onChange?: (iso: string) => void;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, value = "", onChange, onBlur, disabled, ...props }, ref) => {
    const [texto, setTexto] = React.useState(() => isoAFechaCorta(value));
    const [abierto, setAbierto] = React.useState(false);
    const contenedorRef = React.useRef<HTMLDivElement>(null);

    // Sincroniza cuando el valor cambia desde fuera (reset de filtros, carga
    // de un registro para editar…), sin pisar lo que el usuario está tecleando.
    React.useEffect(() => {
      const desdeTexto = fechaCortaAISO(texto) ?? "";
      if (value !== desdeTexto) setTexto(isoAFechaCorta(value));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const hoy = React.useMemo(() => {
      const d = new Date();
      return { anio: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() };
    }, []);

    const seleccion = partesISO(value);
    const [mesVisible, setMesVisible] = React.useState(() => ({
      anio: seleccion?.anio ?? hoy.anio,
      mes: seleccion?.mes ?? hoy.mes,
    }));

    // Al abrir, posiciona el calendario sobre el mes de la fecha elegida.
    React.useEffect(() => {
      if (abierto && seleccion) {
        setMesVisible({ anio: seleccion.anio, mes: seleccion.mes });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [abierto]);

    // Cierre por clic fuera o Escape.
    React.useEffect(() => {
      if (!abierto) return;
      const alClicFuera = (e: MouseEvent) => {
        if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
      };
      const alTeclear = (e: KeyboardEvent) => {
        if (e.key === "Escape") setAbierto(false);
      };
      document.addEventListener("mousedown", alClicFuera);
      document.addEventListener("keydown", alTeclear);
      return () => {
        document.removeEventListener("mousedown", alClicFuera);
        document.removeEventListener("keydown", alTeclear);
      };
    }, [abierto]);

    const alEscribir = (e: React.ChangeEvent<HTMLInputElement>) => {
      const nuevo = aplicarMascaraFechaCorta(e.target.value);
      setTexto(nuevo);
      onChange?.(fechaCortaAISO(nuevo) ?? "");
    };

    const alPerderFoco = (e: React.FocusEvent<HTMLInputElement>) => {
      // Si quedó a medias, se descarta para no dejar texto sin valor detrás.
      if (texto && !fechaCortaAISO(texto)) {
        setTexto("");
        onChange?.("");
      }
      onBlur?.(e);
    };

    const elegirFecha = (anio: number, mes: number, dia: number) => {
      const iso = aISO(anio, mes, dia);
      setTexto(isoAFechaCorta(iso));
      onChange?.(iso);
      setAbierto(false);
    };

    const moverMes = (delta: number) => {
      setMesVisible((m) => {
        const total = m.anio * 12 + (m.mes - 1) + delta;
        return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
      });
    };

    const huecosIniciales = diaSemanaLunes(mesVisible.anio, mesVisible.mes, 1);
    const total = diasEnMes(mesVisible.anio, mesVisible.mes);

    return (
      <div ref={contenedorRef} className={cn("relative", className)}>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/aa"
          value={texto}
          onChange={alEscribir}
          onBlur={alPerderFoco}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          {...props}
        />

        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label="Abrir calendario"
          aria-expanded={abierto}
          onClick={() => setAbierto((v) => !v)}
          className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarDays className="h-4 w-4" />
        </button>

        {abierto && (
          <div
            role="dialog"
            aria-label="Calendario"
            className="absolute left-0 top-full z-50 mt-2 w-64 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Mes anterior"
                onClick={() => moverMes(-1)}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium capitalize">
                {MESES[mesVisible.mes - 1]} {mesVisible.anio}
              </span>
              <button
                type="button"
                aria-label="Mes siguiente"
                onClick={() => moverMes(1)}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 text-center">
              {DIAS_SEMANA.map((d) => (
                <span key={d} className="py-1 text-[11px] text-muted-foreground">
                  {d}
                </span>
              ))}

              {Array.from({ length: huecosIniciales }, (_, i) => (
                <span key={`hueco-${i}`} />
              ))}

              {Array.from({ length: total }, (_, i) => i + 1).map((dia) => {
                const esSeleccionado =
                  seleccion?.anio === mesVisible.anio &&
                  seleccion?.mes === mesVisible.mes &&
                  seleccion?.dia === dia;
                const esHoy =
                  hoy.anio === mesVisible.anio &&
                  hoy.mes === mesVisible.mes &&
                  hoy.dia === dia;
                return (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => elegirFecha(mesVisible.anio, mesVisible.mes, dia)}
                    aria-pressed={esSeleccionado}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
                      !esSeleccionado && "hover:bg-accent hover:text-accent-foreground",
                      esHoy && !esSeleccionado && "font-semibold text-primary",
                      esSeleccionado && "bg-primary font-medium text-primary-foreground"
                    )}
                  >
                    {dia}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex justify-between border-t border-border pt-2">
              <button
                type="button"
                onClick={() => {
                  setMesVisible({ anio: hoy.anio, mes: hoy.mes });
                  elegirFecha(hoy.anio, hoy.mes, hoy.dia);
                }}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => {
                  setTexto("");
                  onChange?.("");
                  setAbierto(false);
                }}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                Limpiar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
DateInput.displayName = "DateInput";

export { DateInput };
