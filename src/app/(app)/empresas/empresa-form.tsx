"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

type Empresa = {
  razonSocial: string;
  cuit: string;
  actividad: string;
  tamano: string;
  provincia: string;
  direccion?: string | null;
};

export function EmpresaForm({
  action,
  empresa,
}: {
  action: (prevState: unknown, formData: FormData) => Promise<ActionResult<{ id: string }> | ActionResult>;
  empresa?: Empresa;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | ActionResult | null, FormData>(
    async (prevState, formData) => action(prevState, formData),
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Guardado correctamente.");
      if (!empresa && "data" in state && state.data?.id) {
        router.push(`/empresas/${state.data.id}`);
      } else {
        router.refresh();
      }
    } else {
      toast.error(state.error);
    }
  }, [state, empresa, router]);

  return (
    <form action={formAction} className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="razonSocial">Razón social</Label>
        <Input id="razonSocial" name="razonSocial" defaultValue={empresa?.razonSocial} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cuit">CUIT</Label>
        <Input id="cuit" name="cuit" placeholder="20-12345678-9" defaultValue={empresa?.cuit} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="actividad">Actividad</Label>
        <Input id="actividad" name="actividad" defaultValue={empresa?.actividad} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tamano">Tamaño</Label>
          <Select name="tamano" defaultValue={empresa?.tamano ?? "PEQUENA"}>
            <SelectTrigger id="tamano" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MICRO">Micro</SelectItem>
              <SelectItem value="PEQUENA">Pequeña</SelectItem>
              <SelectItem value="MEDIANA">Mediana</SelectItem>
              <SelectItem value="GRANDE">Grande</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="provincia">Provincia</Label>
          <Input id="provincia" name="provincia" defaultValue={empresa?.provincia} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="direccion">Domicilio (para el recibo Anexo III)</Label>
        <Input id="direccion" name="direccion" defaultValue={empresa?.direccion ?? ""} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
