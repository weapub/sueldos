"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { ActionResult } from "@/actions/empresas";

export function CategoriaForm({
  action,
}: {
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
      toast.success("Categoría creada.");
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-4 sm:grid-cols-4 items-end">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" placeholder="Administrativo A" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="convenioNombre">Convenio (opcional)</Label>
        <Input id="convenioNombre" name="convenioNombre" placeholder="CCT 130/75" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="salarioBaseConvenio">Salario base (tope art. 245)</Label>
        <Input
          id="salarioBaseConvenio"
          name="salarioBaseConvenio"
          type="number"
          step="0.01"
          min="0"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vigenciaDesde">Vigencia desde</Label>
        <Input id="vigenciaDesde" name="vigenciaDesde" type="date" required />
      </div>
      <Button type="submit" disabled={pending} className="col-span-2 sm:col-span-1">
        {pending ? "Guardando..." : "Agregar categoría"}
      </Button>
    </form>
  );
}
