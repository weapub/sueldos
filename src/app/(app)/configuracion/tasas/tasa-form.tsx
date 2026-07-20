"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { actualizarTasa } from "@/actions/configuracion";
import { CLAVE_TASA_LABEL, CLAVES_MONTO_FIJO, claveTasaValues } from "@/lib/validation/tasas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { ActionResult } from "@/actions/empresas";

export function TasaForm() {
  const router = useRouter();
  const [clave, setClave] = useState<(typeof claveTasaValues)[number] | "">("");
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (prevState, formData) => actualizarTasa(prevState, formData),
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Tasa actualizada.");
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  const esMontoFijo = clave !== "" && CLAVES_MONTO_FIJO.has(clave);

  return (
    <form action={formAction} className="grid max-w-2xl grid-cols-3 gap-4 items-end">
      <div className="space-y-2">
        <Label htmlFor="clave">Concepto</Label>
        <Select name="clave" value={clave} onValueChange={(v) => setClave(v as typeof clave)}>
          <SelectTrigger id="clave" className="w-full">
            <SelectValue placeholder="Elegí un concepto" />
          </SelectTrigger>
          <SelectContent>
            {claveTasaValues.map((c) => (
              <SelectItem key={c} value={c}>
                {CLAVE_TASA_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="valor">{esMontoFijo ? "Monto fijo ($)" : "Valor (fracción, ej. 0.11)"}</Label>
        <Input
          id="valor"
          name="valor"
          type="number"
          step={esMontoFijo ? "0.01" : "0.00001"}
          min="0"
          max={esMontoFijo ? undefined : 1}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vigenciaDesde">Vigente desde</Label>
        <Input id="vigenciaDesde" name="vigenciaDesde" type="date" required />
      </div>
      <Button type="submit" disabled={pending} className="col-span-3 w-fit">
        {pending ? "Guardando..." : "Guardar nueva versión"}
      </Button>
    </form>
  );
}
