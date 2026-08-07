/**
 * Campo de texto con sugerencias de autocompletado desde un catálogo.
 * Permite texto libre si el valor no está en el catálogo (Requisito 17.3).
 *
 * Requisitos: 17.2, 17.3
 */

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  opciones: string[];
  placeholder?: string;
  disabled?: boolean;
  /**
   * Muestra el catálogo completo al enfocar el campo y añade un botón para
   * desplegarlo, de modo que se pueda elegir sin saber de antemano qué hay.
   * Sin esto la lista solo aparece cuando ya se escribió algo.
   */
  permitirExplorar?: boolean;
  "aria-describedby"?: string;
}

export function AutocompleteInput({
  id,
  value,
  onChange,
  opciones,
  placeholder,
  disabled,
  permitirExplorar = false,
  "aria-describedby": ariaDescribedBy,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [destacado, setDestacado] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const filtradas = opciones.filter((op) =>
    op.toLowerCase().includes(value.toLowerCase())
  );

  const handleSelect = (opcion: string) => {
    onChange(opcion);
    setOpen(false);
    setDestacado(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" && filtradas.length > 0) {
        setOpen(true);
        setDestacado(0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      setDestacado((d) => Math.min(d + 1, filtradas.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setDestacado((d) => Math.max(d - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter" && destacado >= 0) {
      handleSelect(filtradas[destacado]!);
      e.preventDefault();
    } else if (e.key === "Escape") {
      setOpen(false);
      setDestacado(-1);
    }
  };

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div className="relative" ref={contenedorRef}>
      <Input
        ref={inputRef}
        id={id}
        value={value}
        className={cn(permitirExplorar && "pr-10")}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(permitirExplorar || (e.target.value.length > 0 && filtradas.length > 0));
          setDestacado(-1);
        }}
        onFocus={() => {
          if (permitirExplorar || (value.length > 0 && filtradas.length > 0)) {
            setOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        role={permitirExplorar ? "combobox" : undefined}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? `${id}-listbox` : undefined}
        aria-activedescendant={
          destacado >= 0 ? `${id}-option-${destacado}` : undefined
        }
        aria-describedby={ariaDescribedBy}
      />
      {permitirExplorar && (
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label="Ver catálogo"
          aria-expanded={open}
          onClick={() => {
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
        </button>
      )}
      {open && filtradas.length > 0 && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-48 overflow-y-auto"
        >
          {filtradas.map((opcion, i) => (
            <li
              key={opcion}
              id={`${id}-option-${i}`}
              role="option"
              aria-selected={i === destacado}
              className={cn(
                "px-3 py-2 text-sm cursor-pointer",
                i === destacado
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
              onMouseDown={() => handleSelect(opcion)}
            >
              {opcion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
