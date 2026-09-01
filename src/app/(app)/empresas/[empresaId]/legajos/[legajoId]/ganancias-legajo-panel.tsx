"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarGananciasLegajoConfig } from "@/actions/ganancias";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export function GananciasLegajoPanel({
  legajoId,
  config,
}: {
  legajoId: string;
  config: {
    liquidaGanancias: boolean;
    computaConyuge: boolean;
    cantidadHijosACargo: number;
    otrasDeduccionesMensuales: string;
  } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [liquida, setLiquida] = useState(config?.liquidaGanancias ?? false);
  const [conyuge, setConyuge] = useState(config?.computaConyuge ?? false);
  const [hijos, setHijos] = useState(String(config?.cantidadHijosACargo ?? 0));
  const [dedu, setDedu] = useState(config?.otrasDeduccionesMensuales ?? "0");

  function guardar() {
    startTransition(async () => {
      const res = await guardarGananciasLegajoConfig(legajoId, {
        liquidaGanancias: liquida,
        computaConyuge: conyuge,
        cantidadHijosACargo: hijos,
        otrasDeduccionesMensuales: dedu,
      });
      if (res.ok) {
        toast.success("Configuración guardada.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="g-liquida"
          checked={liquida}
          onCheckedChange={(v) => setLiquida(v === true)}
        />
        <Label htmlFor="g-liquida" className="font-normal">
          Este legajo liquida Impuesto a las Ganancias (retención 4ta categoría)
        </Label>
      </div>

      {liquida && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-end gap-2 pb-1">
            <Checkbox
              id="g-conyuge"
              checked={conyuge}
              onCheckedChange={(v) => setConyuge(v === true)}
            />
            <Label htmlFor="g-conyuge" className="font-normal">
              Computa cónyuge
            </Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-hijos">Hijos a cargo (deducción)</Label>
            <Input
              id="g-hijos"
              type="number"
              min="0"
              value={hijos}
              onChange={(e) => setHijos(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-dedu">Otras deducciones mensuales ($)</Label>
            <Input
              id="g-dedu"
              type="number"
              step="0.01"
              min="0"
              value={dedu}
              onChange={(e) => setDedu(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Alquiler, hipoteca, seguros, médicos, servicio doméstico, etc. — total mensual ya
              topeado.
            </p>
          </div>
        </div>
      )}

      <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={guardar}>
        {pending ? "Guardando..." : "Guardar configuración de Ganancias"}
      </Button>
    </div>
  );
}
