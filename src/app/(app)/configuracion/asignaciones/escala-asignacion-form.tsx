"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { crearEscalaAsignacion } from "@/actions/asignaciones";
import { tipoAsignacionValues, TIPO_ASIGNACION_LABEL } from "@/lib/validation/asignaciones";
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

export function EscalaAsignacionForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (prev, formData) => crearEscalaAsignacion(prev, formData),
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Fila agregada.");
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-6 items-end">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="tipo">Tipo</Label>
        <Select name="tipo" defaultValue="HIJO">
          <SelectTrigger id="tipo" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tipoAsignacionValues.map((t) => (
              <SelectItem key={t} value={t}>
                {TIPO_ASIGNACION_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="zona">Zona</Label>
        <Input id="zona" name="zona" defaultValue="GENERAL" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="igfDesde">IGF desde</Label>
        <Input id="igfDesde" name="igfDesde" type="number" step="0.01" min="0" defaultValue={0} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="igfHasta">IGF hasta</Label>
        <Input id="igfHasta" name="igfHasta" type="number" step="0.01" min="0" placeholder="sin tope" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="monto">Monto ($)</Label>
        <Input id="monto" name="monto" type="number" step="0.01" min="0" required />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="vigenciaDesde">Vigente desde</Label>
        <Input id="vigenciaDesde" name="vigenciaDesde" type="date" required />
      </div>
      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? "Guardando..." : "Agregar fila"}
      </Button>
    </form>
  );
}
