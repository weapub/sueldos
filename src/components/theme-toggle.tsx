"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const OPCIONES = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

export function ThemeToggle({
  className,
  variant = "ghost",
}: {
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const { theme, setTheme } = useTheme();
  // El contenido del menú solo se monta al abrirlo (post-hidratación), así que
  // leer `theme` acá no genera desajuste de SSR. El ícono del trigger conmuta por
  // CSS (`dark:` variants), no por JS.
  const actual = theme ?? "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size="sm"
          className={cn("justify-start gap-2", className)}
          aria-label="Cambiar tema"
        >
          <Sun className="size-4 dark:hidden" />
          <Moon className="hidden size-4 dark:block" />
          <span className="sm:inline">Tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-36">
        {OPCIONES.map((op) => {
          const Icon = op.icon;
          return (
            <DropdownMenuItem
              key={op.value}
              onSelect={() => setTheme(op.value)}
              className={cn(actual === op.value && "bg-accent text-accent-foreground")}
            >
              <Icon className="size-4" />
              {op.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
