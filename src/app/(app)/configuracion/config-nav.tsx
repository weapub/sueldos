"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/configuracion/usuarios", label: "Usuarios" },
  { href: "/configuracion/tasas", label: "Tasas laborales" },
  { href: "/configuracion/asignaciones", label: "Asignaciones familiares" },
  { href: "/configuracion/ganancias", label: "Ganancias" },
];

export function ConfigNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-3 flex flex-wrap gap-1 rounded-lg bg-muted p-1 text-sm">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-colors",
              active
                ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
