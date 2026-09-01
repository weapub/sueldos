import { requireSession } from "@/lib/authz";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./sidebar-nav";
import { LogOut } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  CONTADOR: "Contador",
  ASISTENTE: "Asistente",
  CLIENTE: "Cliente",
};

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const { user } = session;

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" as const },
    { href: "/empresas", label: "Empresas", icon: "empresas" as const },
    ...(user.role !== "CLIENTE"
      ? [{ href: "/configuracion/usuarios", label: "Configuración", icon: "configuracion" as const }]
      : []),
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 sm:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
            S
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight text-white">Sueldos</h1>
            <p className="text-xs text-sidebar-foreground/60">Ley 27.802</p>
          </div>
        </div>

        <SidebarNav items={navItems} />

        <div className="space-y-2 border-t border-sidebar-border pt-4">
          <div className="flex items-center gap-2.5 px-1">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
              {iniciales(user.name ?? "?")}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <span className="mt-0.5 inline-flex items-center rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-sidebar-foreground/80">
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            </div>
          </div>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-6 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
