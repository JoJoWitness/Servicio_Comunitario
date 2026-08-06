/**
 * Layout principal para páginas autenticadas.
 * Incluye barra de navegación lateral con accesos por rol y header con perfil/logout.
 */
import { Link, useLocation } from "react-router-dom";
import {
  ClipboardList,
  FileText,
  LogOut,
  Settings,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSessionStore } from "@/stores/sessionStore";
import { useLogout } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

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

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const perfil = useSessionStore((s) => s.perfil);
  const { mutate: logout, isPending } = useLogout();
  const location = useLocation();

  const navVisibles = NAV_ITEMS.filter(
    (item) => perfil && item.roles.includes(perfil.rol)
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-border bg-card">
        {/* Logo / nombre del sistema */}
        <div className="flex h-14 items-center px-4 font-semibold text-sm">
          HCSC — Oftalmología
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
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
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

        {/* Perfil, tema y logout */}
        <div className="p-3 space-y-1">
          <Link
            to="/perfil"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
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
                  : "Secretaria"}
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
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
