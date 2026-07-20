"use client";

import { useActionState, useEffect, useState } from "react";
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
import { toast } from "sonner";
import type { ActionResult } from "@/actions/empresas";

export function LegajoForm({
  empresaId,
  categorias,
  action,
}: {
  empresaId: string;
  categorias: { id: string; nombre: string }[];
  action: (prevState: unknown, formData: FormData) => Promise<ActionResult<{ id: string }>>;
}) {
  const router = useRouter();
  const [regimenRIFL, setRegimenRIFL] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (prevState, formData) => action(prevState, formData),
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Legajo creado.");
      router.push(`/empresas/${empresaId}/legajos`);
    } else {
      toast.error(state.error);
    }
  }, [state, router, empresaId]);

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="numeroLegajo">N° de legajo</Label>
          <Input id="numeroLegajo" name="numeroLegajo" type="number" min="1" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cuil">CUIL</Label>
          <Input id="cuil" name="cuil" placeholder="20-12345678-9" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apellido">Apellido</Label>
          <Input id="apellido" name="apellido" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
          <Input id="fechaNacimiento" name="fechaNacimiento" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fechaIngreso">Fecha de ingreso</Label>
          <Input id="fechaIngreso" name="fechaIngreso" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="categoriaId">Categoría</Label>
          <Select name="categoriaId" defaultValue={categorias[0]?.id}>
            <SelectTrigger id="categoriaId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tipoContrato">Tipo de contrato</Label>
          <Select name="tipoContrato" defaultValue="TIEMPO_INDETERMINADO">
            <SelectTrigger id="tipoContrato" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TIEMPO_INDETERMINADO">Tiempo indeterminado</SelectItem>
              <SelectItem value="PLAZO_FIJO">Plazo fijo</SelectItem>
              <SelectItem value="TEMPORADA">Temporada</SelectItem>
              <SelectItem value="PART_TIME">Part-time</SelectItem>
              <SelectItem value="EVENTUAL">Eventual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="modalidadRemuneracion">Modalidad de remuneración</Label>
          <Select name="modalidadRemuneracion" defaultValue="MENSUAL">
            <SelectTrigger id="modalidadRemuneracion" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MENSUAL">Mensual</SelectItem>
              <SelectItem value="JORNAL">Jornal</SelectItem>
              <SelectItem value="HORA">Hora</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sueldoBasico">Sueldo básico</Label>
          <Input id="sueldoBasico" name="sueldoBasico" type="number" step="0.01" min="0" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="horasSemanales">Horas semanales contratadas (part-time)</Label>
          <Input id="horasSemanales" name="horasSemanales" type="number" step="0.5" min="0" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="horasSemanalesFullTime">Horas semanales full-time (categoría)</Label>
          <Input
            id="horasSemanalesFullTime"
            name="horasSemanalesFullTime"
            type="number"
            step="0.5"
            min="0"
            defaultValue={48}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="obraSocial">Obra social (opcional)</Label>
          <Input id="obraSocial" name="obraSocial" />
        </div>
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <div className="flex items-center gap-2">
          <Checkbox id="afiliadoSindical" name="afiliadoSindical" value="true" />
          <Label htmlFor="afiliadoSindical" className="font-normal">
            Afiliado al sindicato (si no, el tope del 2% de deducciones sindicales del art. 133 se
            aplica automáticamente).
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="regimenRIFL"
            name="regimenRIFL"
            value="true"
            checked={regimenRIFL}
            onCheckedChange={(v) => setRegimenRIFL(v === true)}
          />
          <Label htmlFor="regimenRIFL" className="font-normal">
            Alta bajo el Régimen de Incentivo a la Formalización Laboral (RIFL, Título XX Ley
            27.802).
          </Label>
        </div>
        {regimenRIFL && (
          <div className="space-y-2 pl-6">
            <Label htmlFor="regimenRIFLFechaAlta">Fecha de alta RIFL</Label>
            <Input id="regimenRIFLFechaAlta" name="regimenRIFLFechaAlta" type="date" />
            <p className="text-xs text-muted-foreground">
              Solo tiene efecto en la liquidación si además se carga el porcentaje de reducción de
              contribuciones patronales en Configuración → Tasas (hoy es 0% por defecto, sin
              reglamentar).
            </p>
          </div>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Crear legajo"}
      </Button>
    </form>
  );
}
