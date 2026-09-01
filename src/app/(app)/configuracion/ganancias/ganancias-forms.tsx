"use client";

import { useActionState, useEffect } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  crearParametroGanancias,
  eliminarParametroGanancias,
  crearTramoGanancias,
  eliminarTramoGanancias,
} from "@/actions/ganancias";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { ActionResult } from "@/actions/empresas";

function useCrear(action: (prev: unknown, fd: FormData) => Promise<ActionResult<{ id: string }>>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (prev, fd) => action(prev, fd),
    null,
  );
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Guardado.");
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);
  return { formAction, pending };
}

export function ParametroForm() {
  const { formAction, pending } = useCrear((p, fd) => crearParametroGanancias(p, fd));
  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-6 items-end">
      <div className="space-y-1">
        <Label htmlFor="mni">MNI (anual)</Label>
        <Input id="mni" name="mni" type="number" step="0.01" min="0" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="deduccionEspecial">Ded. especial (anual)</Label>
        <Input id="deduccionEspecial" name="deduccionEspecial" type="number" step="0.01" min="0" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="deduccionConyuge">Cónyuge (anual)</Label>
        <Input id="deduccionConyuge" name="deduccionConyuge" type="number" step="0.01" min="0" defaultValue={0} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="deduccionHijo">Hijo (anual)</Label>
        <Input id="deduccionHijo" name="deduccionHijo" type="number" step="0.01" min="0" defaultValue={0} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="vigenciaDesde">Vigente desde</Label>
        <Input id="vigenciaDesde" name="vigenciaDesde" type="date" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "..." : "Agregar período"}
      </Button>
    </form>
  );
}

export function TramoForm({ parametroId }: { parametroId: string }) {
  const { formAction, pending } = useCrear((p, fd) => crearTramoGanancias(p, fd));
  return (
    <form action={formAction} className="grid grid-cols-2 gap-2 sm:grid-cols-6 items-end">
      <input type="hidden" name="parametroId" value={parametroId} />
      <div className="space-y-1">
        <Label className="text-xs">Desde</Label>
        <Input name="desde" type="number" step="0.01" min="0" required />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Hasta</Label>
        <Input name="hasta" type="number" step="0.01" min="0" placeholder="sin tope" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Monto fijo</Label>
        <Input name="montoFijo" type="number" step="0.01" min="0" defaultValue={0} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">% (0-1)</Label>
        <Input name="porcentaje" type="number" step="0.0001" min="0" max="1" required />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Orden</Label>
        <Input name="orden" type="number" min="0" defaultValue={0} />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "..." : "+ tramo"}
      </Button>
    </form>
  );
}

export function EliminarBtn({ kind, id }: { kind: "parametro" | "tramo"; id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label="Eliminar"
      onClick={() =>
        start(async () => {
          const res =
            kind === "parametro"
              ? await eliminarParametroGanancias(id)
              : await eliminarTramoGanancias(id);
          if (res.ok) {
            toast.success("Eliminado.");
            router.refresh();
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
