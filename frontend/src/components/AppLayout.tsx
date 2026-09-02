/**
 * Layout principal para páginas autenticadas.
 *
 * En pantallas grandes (`lg`, ≥ 1024 px) la navegación es la barra lateral
 * fija de siempre. Por debajo, la barra se esconde y aparece una barra
 * superior con el botón de menú: el mismo contenido se abre en un cajón
 * lateral sobre la página. El cajón es un Dialog de Radix, que trae gratis lo
 * que un cajón necesita para ser correcto: foco atrapado y devuelto, cierre
 * con Escape y al tocar fuera, y bloqueo del scroll de fondo.
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ClipboardList,
  FileText,
  Loader2,
  LogOut,
  Menu,
  Microscope,
  Settings,
  User,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSessionStore } from "@/stores/sessionStore";
import { useConexionStore } from "@/stores/conexionStore";
import { useLogout } from "@/hooks/useAuth";
import { PanelConexion } from "@/offline/PanelConexion";
import { usePendientes } from "@/offline/useSincronizacion";
import { cn } from "@/lib/utils";
import logoServicio from "@/assets/logo-servicio.svg";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Mis Notas",
    href: "/mis-notas",
    icon: <FileText className="h-4 w-4" />,
    roles: ["medico"],
  },
  {
    label: "Todas las Notas",
    href: "/notas",
    icon: <ClipboardList className="h-4 w-4" />,
    roles: ["secretaria", "admin"],
  },
  {
    label: "Pacientes",
    href: "/pacientes",
    icon: <User className="h-4 w-4" />,
    roles: ["medico", "secretaria", "admin"],
  },
  {
    label: "Biopsias",
    href: "/biopsias",
    icon: <Microscope className="h-4 w-4" />,
    roles: ["medico", "secretaria", "admin"],
  },
  {
    label: "Usuarios",
    href: "/usuarios",
    icon: <Users className="h-4 w-4" />,
    roles: ["admin"],
  },
  {
    label: "Catálogos",
    href: "/catalogos",
    icon: <Settings className="h-4 w-4" />,
    roles: ["admin"],
  },
];

// ---------------------------------------------------------------------------
// Contenido de la barra (compartido por la lateral fija y el cajón)
// ---------------------------------------------------------------------------

function ContenidoBarra({ onCerrar }: { onCerrar?: () => void }) {
  const perfil = useSessionStore((s) => s.perfil);
  const { mutate: logout, isPending } = useLogout();
  const location = useLocation();

  const navVisibles = NAV_ITEMS.filter(
    (item) => perfil && item.roles.includes(perfil.rol)
  );

  return (
    <>
      {/*
        Logo del servicio. Se invierte a blanco en oscuro porque su tinta
        original es un azul casi negro que desaparecería sobre el fondo.
      */}
      <div className="flex h-28 items-center justify-center px-4">
        <img
          src={logoServicio}
          alt="Servicio de Oftalmología — Hospital Central de San Cristóbal"
          className="h-20 w-auto max-w-full dark:brightness-0 dark:invert"
        />
        {onCerrar && (
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogPrimitive.Close>
        )}
      </div>
      <Separator />

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {navVisibles.map((item) => {
            const active = location.pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={onCerrar}
                  className={cn(
                    // Alto mínimo táctil (44 px) fuera del escritorio.
                    "flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors lg:min-h-0",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Separator />

      {/* Conexión y trabajo pendiente de subir */}
      <PanelConexion />

      <Separator />

      {/* Perfil, tema y logout */}
      <div className="p-3 space-y-1">
        <Link
          to="/perfil"
          onClick={onCerrar}
          className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors lg:min-h-0"
        >
          <User className="h-4 w-4 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="truncate leading-tight">
              {perfil ? `${perfil.nombres} ${perfil.apellidos}` : "Perfil"}
            </span>
            {perfil && (
              <span className={cn(
                "text-xs font-medium mt-0.5 w-fit rounded px-1.5 py-0.5 leading-none",
                perfil.rol === "admin"      && "bg-primary/10 text-primary",
                perfil.rol === "medico"     && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                perfil.rol === "secretaria" && "bg-violet-500/10 text-violet-600 dark:text-violet-400",
              )}>
                {perfil.rol === "admin"      ? "Administrador"
                : perfil.rol === "medico"    ? "Médico"
                : "Secretario"}
              </span>
            )}
          </div>
        </Link>

        {/* Selector de tema en modo expandido (tres botones) */}
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-muted-foreground">Tema</span>
          <ThemeToggle expanded />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => logout()}
          disabled={isPending}
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Indicador compacto de conexión para la barra superior
// ---------------------------------------------------------------------------

function IndicadorConexion() {
  const estado = useConexionStore((s) => s.estado);
  const { data: pendientes = [] } = usePendientes();
  const conError = pendientes.some((p) => p.estado === "error");

  const etiqueta =
    estado === "comprobando"
      ? "Comprobando conexión"
      : estado === "sin-conexion"
        ? "Sin conexión"
        : "En línea";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs",
        estado === "sin-conexion"
          ? "text-amber-600 dark:text-amber-400"
          : "text-muted-foreground"
      )}
      role="status"
      aria-label={
        pendientes.length > 0
          ? `${etiqueta}, ${pendientes.length} pendientes de subir`
          : etiqueta
      }
      title={etiqueta}
    >
      {estado === "comprobando" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : estado === "sin-conexion" ? (
        <WifiOff className="h-4 w-4" />
      ) : (
        <Wifi className="h-4 w-4" />
      )}
      {pendientes.length > 0 && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
            conError
              ? "bg-destructive/15 text-destructive"
              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          )}
        >
          {pendientes.length}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();

  // Navegar cierra el cajón: el destino ya está en pantalla.
  useEffect(() => {
    setMenuAbierto(false);
  }, [location.pathname]);

  return (
    // `h-dvh` y no `h-screen`: en los navegadores móviles la barra de
    // direcciones se come parte de `100vh` y el pie del layout queda oculto.
    <div className="flex h-dvh bg-background">
      {/* Barra lateral fija: solo en escritorio */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <ContenidoBarra />
      </aside>

      {/* Cajón: solo por debajo de escritorio */}
      <DialogPrimitive.Root open={menuAbierto} onOpenChange={setMenuAbierto}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 lg:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left lg:hidden"
          >
            <DialogPrimitive.Title className="sr-only">Menú de navegación</DialogPrimitive.Title>
            <div className="relative flex h-full flex-col">
              <ContenidoBarra onCerrar={() => setMenuAbierto(false)} />
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior: solo por debajo de escritorio */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-2 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <img
            src={logoServicio}
            alt="Servicio de Oftalmología — Hospital Central de San Cristóbal"
            className="h-9 w-auto dark:brightness-0 dark:invert"
          />
          <div className="ml-auto flex items-center gap-2 pr-1">
            <IndicadorConexion />
          </div>
        </header>

        {/*
          Contenido principal.
          `relative` es necesario: los elementos con `position: absolute` que
          cuelgan del contenido (p. ej. el <select> oculto que Radix renderiza
          junto a cada Select) buscan el ancestro posicionado más cercano. Sin
          él escapan de este contenedor, se posicionan respecto al documento y
          estiran el alto de la página dejando un espacio vacío bajo el layout.
        */}
        <main className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
