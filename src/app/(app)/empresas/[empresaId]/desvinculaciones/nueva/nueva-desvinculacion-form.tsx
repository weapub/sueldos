"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motivoDesvinculacionValues, MOTIVO_LABEL } from "@/lib/validation/desvinculaciones";
import { toast } from "sonner";
import type { ActionResult } from "@/actions/empresas";

export function NuevaDesvinculacionForm({
  empresaId,
  legajos,
  action,
}: {
  empresaId: string;
  legajos: { id: string; nombre: string }[];
  action: (prevState: unknown, formData: FormData) => Promise<ActionResult<{ id: string }>>;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (prevState, formData) => action(prevState, formData),
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Desvinculación creada.");
      router.push(`/empresas/${empresaId}/desvinculaciones/${state.data.id}`);
    } else {
      toast.error(state.error);
    }
  }, [state, router, empresaId]);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <Label htmlFor="legajoId">Legajo</Label>
        <Select name="legajoId" defaultValue={legajos[0]?.id}>
          <SelectTrigger id="legajoId" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {legajos.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="motivo">Motivo</Label>
        <Select name="motivo" defaultValue="DESPIDO_SIN_CAUSA">
          <SelectTrigger id="motivo" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {motivoDesvinculacionValues.map((m) => (
              <SelectItem key={m} value={m}>
                {MOTIVO_LABEL[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="fechaEgreso">Fecha de egreso</Label>
        <Input id="fechaEgreso" name="fechaEgreso" type="date" required />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="preavisoOtorgado" name="preavisoOtorgado" value="true" />
        <Label htmlFor="preavisoOtorgado" className="font-normal">
          El preaviso fue otorgado (trabajado), no corresponde indemnización sustitutiva.
        </Label>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creando..." : "Crear desvinculación"}
      </Button>
    </form>
  );
}
