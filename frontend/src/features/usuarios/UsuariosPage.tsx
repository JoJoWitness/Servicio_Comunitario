/**
 * Administración de usuarios — solo admin.
 *
 * Listado de todos los usuarios con filtros estructurados server-side,
 * paginación, creación, edición de rol y baja lógica.
 *
 * Requisitos: 28.1–28.6
 */

import { useEffect, useState } from "react";
import { Pencil, Plus, UserX, FilterX } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ControlsPaginacion } from "@/components/ControlsPaginacion";
import {
  useListarUsuarios,
  useCrearUsuario,
  useEditarUsuario,
  useDesactivarUsuario,
} from "@/hooks/useUsuarios";
import { useServerPaginacion } from "@/hooks/usePaginacion";
import { useDebounce } from "@/hooks/useDebounce";
import { useSessionStore } from "@/stores/sessionStore";
import { isApiError } from "@/api/errors";
import type { Rol, Usuario } from "@/domain/models";

// ---------------------------------------------------------------------------
// Helpers de display
// ---------------------------------------------------------------------------

const ROL_LABEL: Record<Rol, string> = {
  admin: "Administrador",
  medico: "Médico",
  secretaria: "Secretario",
};

const ROL_VARIANT: Record<Rol, "default" | "secondary" | "outline"> = {
  admin: "default",
  medico: "secondary",
  secretaria: "outline",
};

// ---------------------------------------------------------------------------
// Formulario de usuario (crear / editar)
// ---------------------------------------------------------------------------

interface FormUsuarioProps {
  usuarioInicial?: Usuario;
  onClose: () => void;
}

function FormUsuario({ usuarioInicial, onClose }: FormUsuarioProps) {
  const esEdicion = !!usuarioInicial;

  const [correo, setCorreo] = useState(usuarioInicial?.correo ?? "");
  const [nombres, setNombres] = useState(usuarioInicial?.nombres ?? "");
  const [apellidos, setApellidos] = useState(usuarioInicial?.apellidos ?? "");
  const [rol, setRol] = useState<Rol>(usuarioInicial?.rol ?? "medico");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const { mutateAsync: crearUsuario } = useCrearUsuario();
  const { mutateAsync: editarUsuario } = useEditarUsuario(usuarioInicial?.id ?? "");

  const handleGuardar = async () => {
    setError(null);
    if (!correo.trim() || !nombres.trim() || !apellidos.trim()) {
      setError("Correo, nombres y apellidos son obligatorios.");
      return;
    }
    if (!esEdicion && contrasena.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setGuardando(true);
    try {
      if (esEdicion) {
        // Req 28.3, 28.5: editar datos y/o rol
        await editarUsuario({ correo, nombres, apellidos, rol });
      } else {
        // Req 28.2: crear usuario
        await crearUsuario({ correo, nombres, apellidos, rol, contrasena });
      }
      onClose();
    } catch (err) {
      setError(
        isApiError(err) ? err.body || "Error al guardar." : "Error inesperado."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-3 py-2">
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="u-nombres">Nombres *</Label>
          <Input
            id="u-nombres"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="u-apellidos">Apellidos *</Label>
          <Input
            id="u-apellidos"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="u-correo">Correo electrónico *</Label>
        <Input
          id="u-correo"
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          autoComplete="off"
        />
      </div>

      {/* Req 28.5: cambiar rol */}
      <div className="space-y-1">
        <Label htmlFor="u-rol">Rol *</Label>
        <Select value={rol} onValueChange={(v) => setRol(v as Rol)}>
          <SelectTrigger id="u-rol">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="medico">Médico</SelectItem>
            <SelectItem value="secretaria">Secretario</SelectItem>
            {/*
              Administrador no se ofrece: desde esta página no se crean cuentas
              con mando sobre el resto, ni dando de alta ni cambiándole el rol a
              alguien. Solo aparece cuando se está editando a un admin que ya lo
              era, para que el selector muestre su rol de verdad y no un hueco.
            */}
            {usuarioInicial?.rol === "admin" && (
              <SelectItem value="admin">Administrador</SelectItem>
            )}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          El rol de administrador no se asigna desde aquí.
        </p>
      </div>

      {/* Contraseña solo en creación */}
      {!esEdicion && (
        <div className="space-y-1">
          <Label htmlFor="u-contrasena">Contraseña * (mínimo 8 caracteres)</Label>
          <PasswordInput
            id="u-contrasena"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete="new-password"
          />
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleGuardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function UsuariosPage() {
  const perfil = useSessionStore((s) => s.perfil);

  const [dialogCrear, setDialogCrear] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState<Usuario | null>(null);
  const [bajaId, setBajaId] = useState<string | null>(null);
  const [errorBaja, setErrorBaja] = useState<string | null>(null);

  // --- Estado de filtros ---
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState("");

  // Debounce 500ms para texto libre
  const nombreDebounced = useDebounce(nombre, 500);
  const correoDebounced = useDebounce(correo, 500);

  // Paginación server-side
  const paginacion = useServerPaginacion("apellidos", "ASC", 20);

  // Al cambiar cualquier filtro, volver a página 1
  useEffect(() => { paginacion.resetear(); }, [nombreDebounced, correoDebounced, rol]);

  const filtros = {
    nombre: nombreDebounced || undefined,
    correo: correoDebounced || undefined,
    rol: rol || undefined,
  };

  const { data: respuesta, isLoading } = useListarUsuarios(filtros, {
    page: paginacion.pagina,
    size: paginacion.size,
    sortBy: paginacion.sortBy,
    order: paginacion.order,
  });

  useEffect(() => {
    if (respuesta?.meta) paginacion.setMeta(respuesta.meta);
  }, [respuesta?.meta]);

  const usuarios = respuesta?.data ?? [];

  const { mutateAsync: desactivar, isPending: dando } = useDesactivarUsuario();

  const hayFiltros = nombre || correo || rol;

  const limpiarFiltros = () => {
    setNombre("");
    setCorreo("");
    setRol("");
  };

  const handleBaja = async () => {
    if (!bajaId) return;
    setErrorBaja(null);
    try {
      await desactivar(bajaId);
      setBajaId(null);
    } catch (err) {
      setErrorBaja(
        isApiError(err) ? err.body || "Error al dar de baja." : "Error inesperado."
      );
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <Button size="sm" onClick={() => setDialogCrear(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar usuario
          </Button>
        </div>

        {/* Panel de filtros estructurados */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="uf-nombre">Nombre</Label>
            <Input
              id="uf-nombre"
              placeholder="Buscar por nombre o apellido…"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              aria-label="Filtrar por nombre"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="uf-correo">Correo</Label>
            <Input
              id="uf-correo"
              placeholder="Buscar por correo…"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              aria-label="Filtrar por correo"
            />
          </div>
          <div className="space-y-1">
            <Label>Rol</Label>
            <Select value={rol} onValueChange={setRol}>
              <SelectTrigger aria-label="Filtrar por rol">
                <SelectValue placeholder="Todos los roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="medico">Médico</SelectItem>
                <SelectItem value="secretaria">Secretario</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hayFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
            <FilterX className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        )}

        {errorBaja && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{errorBaja}</AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <p className="text-sm text-muted-foreground" role="status">
            Cargando usuarios…
          </p>
        )}

        {!isLoading && usuarios.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {hayFiltros ? "No hay usuarios con esos filtros." : "No hay usuarios registrados."}
          </p>
        )}

        {/* Req 28.1: listado con rol */}
        {usuarios.length > 0 && (
          <div className="rounded-md border max-md:border-0">
            <Table responsive>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell data-label="Nombre" className="font-medium">
                      {u.nombres} {u.apellidos}
                      {u.id === perfil?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (tú)
                        </span>
                      )}
                    </TableCell>
                    <TableCell data-label="Correo" className="break-all text-sm text-muted-foreground">
                      {u.correo}
                    </TableCell>
                    <TableCell data-label="Rol">
                      <Badge variant={ROL_VARIANT[u.rol]}>
                        {ROL_LABEL[u.rol]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Editar ${u.nombres}`}
                          onClick={() => setEditandoUsuario(u)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {/* No mostrar baja para el propio usuario */}
                        {u.id !== perfil?.id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            aria-label={`Dar de baja a ${u.nombres}`}
                            onClick={() => setBajaId(u.id)}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 pb-3">
              <ControlsPaginacion {...paginacion} />
            </div>
          </div>
        )}
      </div>

      {/* Diálogo crear usuario — Req 28.2 */}
      <Dialog open={dialogCrear} onOpenChange={setDialogCrear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar usuario</DialogTitle>
          </DialogHeader>
          <FormUsuario onClose={() => setDialogCrear(false)} />
        </DialogContent>
      </Dialog>

      {/* Diálogo editar usuario — Req 28.3, 28.5 */}
      <Dialog
        open={editandoUsuario !== null}
        onOpenChange={() => setEditandoUsuario(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          {editandoUsuario && (
            <FormUsuario
              usuarioInicial={editandoUsuario}
              onClose={() => setEditandoUsuario(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo baja lógica — Req 28.4 */}
      <Dialog open={bajaId !== null} onOpenChange={() => setBajaId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Dar de baja a este usuario?</DialogTitle>
            <DialogDescription>
              El usuario quedará inactivo y no podrá iniciar sesión. Esta
              acción puede revertirse desde la administración de base de datos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBajaId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleBaja} disabled={dando}>
              {dando ? "Dando de baja…" : "Confirmar baja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
