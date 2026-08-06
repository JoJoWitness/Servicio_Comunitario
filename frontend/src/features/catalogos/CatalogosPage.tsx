/**
 * Administración de catálogos clínicos — solo admin.
 *
 * Tres pestañas: Diagnósticos | Procedimientos | Técnicas
 * CRUD completo: listar, crear, editar y eliminar.
 *
 * Las acciones de crear/editar/eliminar están ocultas para médico y secretaria
 * (la Guardia_Ruta ya impide acceder a esta ruta, pero el componente también
 * lo refuerza a nivel visual — Req 27.6).
 *
 * Requisitos: 27.1–27.6
 */

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useDiagnosticos,
  useProcedimientos,
  useTecnicas,
  useCrearDiagnostico,
  useEditarDiagnostico,
  useEliminarDiagnostico,
  useCrearProcedimiento,
  useEditarProcedimiento,
  useEliminarProcedimiento,
  useCrearTecnica,
  useEditarTecnica,
  useEliminarTecnica,
} from "@/hooks/useCatalogos";
import { isApiError } from "@/api/errors";
import type { Diagnostico, Procedimiento, Tecnica } from "@/domain/models";

// ---------------------------------------------------------------------------
// Pestaña activa
// ---------------------------------------------------------------------------

type Pestana = "diagnosticos" | "procedimientos" | "tecnicas";

// ---------------------------------------------------------------------------
// Componente genérico de tabla CRUD de catálogo
// ---------------------------------------------------------------------------

interface ItemCatalogo {
  id: number;
  nombre: string;
  resumen?: string;
}

interface TabCatalogoProps {
  items: ItemCatalogo[];
  isLoading: boolean;
  nombreEntidad: string;
  /** Etiqueta del campo nombre (varía por catálogo) */
  campoNombre: string;
  onCrear: (nombre: string, resumen: string) => Promise<void>;
  onEditar: (id: number, nombre: string, resumen: string) => Promise<void>;
  onEliminar: (id: number) => Promise<void>;
}

function TabCatalogo({
  items,
  isLoading,
  nombreEntidad,
  campoNombre,
  onCrear,
  onEditar,
  onEliminar,
}: TabCatalogoProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<ItemCatalogo | null>(null);
  const [eliminarId, setEliminarId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [resumen, setResumen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const abrirCrear = () => {
    setEditando(null);
    setNombre("");
    setResumen("");
    setError(null);
    setDialogOpen(true);
  };

  const abrirEditar = (item: ItemCatalogo) => {
    setEditando(item);
    setNombre(item.nombre);
    setResumen(item.resumen ?? "");
    setError(null);
    setDialogOpen(true);
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      setError(`El campo "${campoNombre}" es obligatorio.`);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      if (editando) {
        await onEditar(editando.id, nombre.trim(), resumen.trim());
      } else {
        await onCrear(nombre.trim(), resumen.trim());
      }
      setDialogOpen(false);
    } catch (err) {
      setError(
        isApiError(err) ? err.body || "Error al guardar." : "Error inesperado."
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async () => {
    if (eliminarId === null) return;
    setEliminando(true);
    try {
      await onEliminar(eliminarId);
      setEliminarId(null);
    } catch (err) {
      setEliminarId(null);
      setError(
        isApiError(err) ? err.body || "Error al eliminar." : "Error inesperado."
      );
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={abrirCrear}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar {nombreEntidad.toLowerCase()}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground" role="status">
          Cargando…
        </p>
      )}

      {!isLoading && items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No hay {nombreEntidad.toLowerCase()}s registrados.
        </p>
      )}

      {items.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{campoNombre}</TableHead>
                <TableHead>Resumen</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {item.resumen ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Editar ${item.nombre}`}
                        onClick={() => abrirEditar(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Eliminar ${item.nombre}`}
                        className="text-destructive hover:text-destructive"
                        onClick={() => setEliminarId(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Diálogo crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editando ? `Editar ${nombreEntidad.toLowerCase()}` : `Nuevo ${nombreEntidad.toLowerCase()}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1">
              <Label htmlFor="campo-nombre">{campoNombre} *</Label>
              <Input
                id="campo-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="campo-resumen">Resumen</Label>
              <Textarea
                id="campo-resumen"
                value={resumen}
                onChange={(e) => setResumen(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo eliminar */}
      <Dialog open={eliminarId !== null} onOpenChange={() => setEliminarId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar esta entrada?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Las notas que referencien esta
              entrada conservarán el texto tal como fue guardado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEliminarId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleEliminar}
              disabled={eliminando}
            >
              {eliminando ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function CatalogosPage() {
  const [pestana, setPestana] = useState<Pestana>("diagnosticos");

  const { data: diagnosticos = [], isLoading: ldx } = useDiagnosticos();
  const { data: procedimientos = [], isLoading: lpr } = useProcedimientos();
  const { data: tecnicas = [], isLoading: ltc } = useTecnicas();

  const { mutateAsync: crearDx } = useCrearDiagnostico();
  const { mutateAsync: editarDx } = useEditarDiagnostico();
  const { mutateAsync: elimDx } = useEliminarDiagnostico();

  const { mutateAsync: crearPr } = useCrearProcedimiento();
  const { mutateAsync: editarPr } = useEditarProcedimiento();
  const { mutateAsync: elimPr } = useEliminarProcedimiento();

  const { mutateAsync: crearTc } = useCrearTecnica();
  const { mutateAsync: editarTc } = useEditarTecnica();
  const { mutateAsync: elimTc } = useEliminarTecnica();

  const PESTANAS: { id: Pestana; label: string }[] = [
    { id: "diagnosticos", label: "Diagnósticos" },
    { id: "procedimientos", label: "Procedimientos" },
    { id: "tecnicas", label: "Técnicas" },
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Catálogos clínicos</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona los diagnósticos, procedimientos y técnicas disponibles para el
          autocompletado en el formulario de notas.
        </p>

        {/* Pestañas */}
        <div className="flex gap-1 border-b">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPestana(p.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                pestana === p.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              aria-selected={pestana === p.id}
              role="tab"
            >
              {p.label}
              <Badge variant="secondary" className="ml-2 text-xs">
                {p.id === "diagnosticos"
                  ? diagnosticos.length
                  : p.id === "procedimientos"
                  ? procedimientos.length
                  : tecnicas.length}
              </Badge>
            </button>
          ))}
        </div>

        <Separator />

        {/* Contenido de la pestaña activa */}
        {pestana === "diagnosticos" && (
          <TabCatalogo
            items={diagnosticos.map((d: Diagnostico) => ({
              id: d.id,
              nombre: d.diagnostico,
              resumen: d.resumen,
            }))}
            isLoading={ldx}
            nombreEntidad="Diagnóstico"
            campoNombre="Diagnóstico"
            onCrear={(nombre, resumen) => crearDx({ diagnostico: nombre, resumen: resumen || undefined })}
            onEditar={(id, nombre, resumen) => editarDx({ id, datos: { diagnostico: nombre, resumen: resumen || undefined } })}
            onEliminar={(id) => elimDx(id)}
          />
        )}

        {pestana === "procedimientos" && (
          <TabCatalogo
            items={procedimientos.map((p: Procedimiento) => ({
              id: p.id,
              nombre: p.intervencion,
              resumen: p.resumen,
            }))}
            isLoading={lpr}
            nombreEntidad="Procedimiento"
            campoNombre="Intervención"
            onCrear={(nombre, resumen) => crearPr({ intervencion: nombre, resumen: resumen || undefined })}
            onEditar={(id, nombre, resumen) => editarPr({ id, datos: { intervencion: nombre, resumen: resumen || undefined } })}
            onEliminar={(id) => elimPr(id)}
          />
        )}

        {pestana === "tecnicas" && (
          <TabCatalogo
            items={tecnicas.map((t: Tecnica) => ({
              id: t.id,
              nombre: t.tecnica,
              resumen: t.frase,
            }))}
            isLoading={ltc}
            nombreEntidad="Técnica"
            campoNombre="Técnica"
            onCrear={(nombre, frase) => crearTc({ tecnica: nombre, frase: frase || undefined })}
            onEditar={(id, nombre, frase) => editarTc({ id, datos: { tecnica: nombre, frase: frase || undefined } })}
            onEliminar={(id) => elimTc(id)}
          />
        )}
      </div>
    </AppLayout>
  );
}
