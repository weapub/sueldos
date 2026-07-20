"use client";

import { useActionState, useEffect, useState } from "react";
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
import { CATALOGO_CCT_130_75 } from "@/lib/catalogoConvenios";

const CAMPOS_VACIOS = { nombre: "", convenioNombre: "", salarioBaseConvenio: "", vigenciaDesde: "" };

export function CategoriaForm({
  action,
}: {
  action: (prevState: unknown, formData: FormData) => Promise<ActionResult<{ id: string }>>;
}) {
  const router = useRouter();
  const [campos, setCampos] = useState(CAMPOS_VACIOS);
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (prevState, formData) => action(prevState, formData),
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Categoría creada.");
      setCampos(CAMPOS_VACIOS);
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  function aplicarPreset(nombrePreset: string) {
    const preset = CATALOGO_CCT_130_75.find((p) => p.nombre === nombrePreset);
    if (!preset) return;
    setCampos({
      nombre: preset.nombre,
      convenioNombre: preset.convenioNombre,
      salarioBaseConvenio: String(preset.salarioBaseConvenio),
      vigenciaDesde: preset.vigenciaDesde,
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2 max-w-xs">
        <Label htmlFor="preset">Cargar desde escala CCT 130/75 (opcional)</Label>
        <Select onValueChange={aplicarPreset}>
          <SelectTrigger id="preset" className="w-full">
            <SelectValue placeholder="Elegir categoría..." />
          </SelectTrigger>
          <SelectContent>
            {CATALOGO_CCT_130_75.map((p) => (
              <SelectItem key={p.nombre} value={p.nombre}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Autocompleta los campos de abajo con la escala verificada; podés editarlos antes de guardar.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            placeholder="Administrativo A"
            value={campos.nombre}
            onChange={(e) => setCampos((c) => ({ ...c, nombre: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="convenioNombre">Convenio (opcional)</Label>
          <Input
            id="convenioNombre"
            name="convenioNombre"
            placeholder="CCT 130/75"
            value={campos.convenioNombre}
            onChange={(e) => setCampos((c) => ({ ...c, convenioNombre: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salarioBaseConvenio">Salario base (tope art. 245)</Label>
          <Input
            id="salarioBaseConvenio"
            name="salarioBaseConvenio"
            type="number"
            step="0.01"
            min="0"
            value={campos.salarioBaseConvenio}
            onChange={(e) => setCampos((c) => ({ ...c, salarioBaseConvenio: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vigenciaDesde">Vigencia desde</Label>
          <Input
            id="vigenciaDesde"
            name="vigenciaDesde"
            type="date"
            value={campos.vigenciaDesde}
            onChange={(e) => setCampos((c) => ({ ...c, vigenciaDesde: e.target.value }))}
            required
          />
        </div>
        <Button type="submit" disabled={pending} className="col-span-2 sm:col-span-1">
          {pending ? "Guardando..." : "Agregar categoría"}
        </Button>
      </div>
    </form>
  );
}
