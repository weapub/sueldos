"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearPeriodoLiquidacion } from "@/actions/liquidaciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const hoy = new Date();

export function NuevoPeriodoForm({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="max-w-sm space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await crearPeriodoLiquidacion(empresaId, anio, mes);
          if (result.ok) {
            router.push(`/empresas/${empresaId}/liquidaciones/${result.data.id}`);
          } else {
            toast.error(result.error);
          }
        });
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="anio">Año</Label>
          <Input
            id="anio"
            type="number"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mes">Mes</Label>
          <Input
            id="mes"
            type="number"
            min={1}
            max={12}
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            required
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creando..." : "Crear período"}
      </Button>
    </form>
  );
}
