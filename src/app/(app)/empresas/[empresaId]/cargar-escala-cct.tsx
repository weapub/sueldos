"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cargarEscalaCCT13075 } from "@/actions/legajos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function CargarEscalaCCT({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const [vigenciaDesde, setVigenciaDesde] = useState("2026-07-01");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="cct-vigencia">Vigencia desde</Label>
        <Input
          id="cct-vigencia"
          type="date"
          value={vigenciaDesde}
          onChange={(e) => setVigenciaDesde(e.target.value)}
          className="w-[10rem]"
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await cargarEscalaCCT13075(empresaId, vigenciaDesde);
            if (res.ok) {
              toast.success(
                `Escala CCT 130/75: ${res.data.creadas} categoría/s creada/s${
                  res.data.salteadas ? `, ${res.data.salteadas} ya existían` : ""
                }.`,
              );
              router.refresh();
            } else {
              toast.error(res.error);
            }
          })
        }
      >
        {pending ? "Cargando..." : "Cargar escala CCT 130/75"}
      </Button>
      <p className="w-full text-xs text-muted-foreground">
        Crea las 21 categorías del CCT 130/75 (escala FAECYS, acuerdo 04/2026, valores julio 2026
        consolidados). Saltea las que ya existan; los montos quedan editables.
      </p>
    </div>
  );
}
