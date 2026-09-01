import Link from "next/link";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, FileClock, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await requireSession();
  const empresaFilter =
    session.user.role === "CLIENTE" ? { id: session.user.empresaId ?? "" } : {};

  const [empresas, periodosPendientes, eventosPendientes] = await Promise.all([
    db.empresa.count({ where: { ...empresaFilter, activa: true } }),
    db.periodoLiquidacion.count({
      where: { estado: "BORRADOR", empresa: empresaFilter },
    }),
    db.eventoDesvinculacion.count({
      where: { estado: "BORRADOR", empresa: empresaFilter },
    }),
  ]);

  const stats = [
    {
      label: "Empresas activas",
      value: empresas,
      icon: Building2,
      href: "/empresas",
      linkLabel: "Ver empresas",
    },
    {
      label: "Períodos en borrador",
      value: periodosPendientes,
      icon: FileClock,
    },
    {
      label: "Desvinculaciones pendientes",
      value: eventosPendientes,
      icon: UserMinus,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hola, {session.user.name}</h1>
        <p className="text-sm text-muted-foreground">Resumen general del estudio.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="transition-shadow duration-150 hover:shadow-md"
          >
            <CardContent className="flex items-start gap-4">
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
                )}
              >
                <stat.icon className="size-5" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                {stat.href && (
                  <Link
                    href={stat.href}
                    className="inline-block text-sm font-medium text-primary hover:underline"
                  >
                    {stat.linkLabel}
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
