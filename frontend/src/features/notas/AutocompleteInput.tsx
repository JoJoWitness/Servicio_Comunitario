/**
 * Campo de texto con sugerencias de autocompletado desde un catálogo.
 * Permite texto libre si el valor no está en el catálogo (Requisito 17.3).
 *
 * Requisitos: 17.2, 17.3
 */

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  opciones: string[];
  placeholder?: string;
  disabled?: boolean;
  "aria-describedby"?: string;
}

export function AutocompleteInput({
  id,
  value,
  onChange,
  opciones,
  placeholder,
  disabled,
  "aria-describedby": ariaDescribedBy,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [destacado, setDestacado] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(e.target.value.length > 0 && filtradas.length > 0);
          setDestacado(-1);
        }}
        onFocus={() => {
          if (value.length > 0 && filtradas.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? `${id}-listbox` : undefined}
        aria-activedescendant={
          destacado >= 0 ? `${id}-option-${destacado}` : undefined
        }
        aria-describedby={ariaDescribedBy}
      />
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
