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
import type { LegajoDesdeAlta } from "@/lib/arca/mapearAlta";

export type LegajoFormDefaults = Omit<LegajoDesdeAlta, "sueldoBasico"> & {
  numeroLegajo?: number | string;
  fechaNacimiento?: string;
  categoriaId?: string;
  sueldoBasico?: number | string;
  horasSemanales?: number | string | null;
  horasSemanalesFullTime?: number | string;
  afiliadoSindical?: boolean;
  regimenRIFL?: boolean;
  regimenRIFLFechaAlta?: string | null;
};

export function LegajoForm({
  empresaId,
  categorias,
  action,
  modo = "crear",
  defaults,
  valoresIniciales,
  categoriaIdSugerida,
  notaCategoria,
}: {
  empresaId: string;
  categorias: { id: string; nombre: string }[];
  action: (prevState: unknown, formData: FormData) => Promise<ActionResult<{ id: string }>>;
  modo?: "crear" | "editar";
  defaults?: LegajoFormDefaults;
  valoresIniciales?: LegajoDesdeAlta;
  categoriaIdSugerida?: string | null;
  notaCategoria?: string | null;
}) {
  const router = useRouter();
  const d: LegajoFormDefaults = { ...valoresIniciales, ...defaults };

  const [regimenRIFL, setRegimenRIFL] = useState(d.regimenRIFL ?? false);
  const [campos, setCampos] = useState({
    cuil: d.cuil ?? "",
    nombre: d.nombre ?? "",
    apellido: d.apellido ?? "",
    fechaIngreso: d.fechaIngreso ?? "",
    sueldoBasico: d.sueldoBasico != null ? String(d.sueldoBasico) : "",
    obraSocial: d.obraSocial ?? "",
  });
  const [tipoContrato, setTipoContrato] = useState<string>(d.tipoContrato ?? "TIEMPO_INDETERMINADO");
  const [modalidadRemuneracion, setModalidadRemuneracion] = useState<string>(
    d.modalidadRemuneracion ?? "MENSUAL",
  );
  const [categoriaId, setCategoriaId] = useState<string | undefined>(
    categoriaIdSugerida ?? d.categoriaId ?? categorias[0]?.id,
  );

  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (prevState, formData) => action(prevState, formData),
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      if (modo === "editar") {
        toast.success("Legajo actualizado.");
        router.push(`/empresas/${empresaId}/legajos/${state.data.id}`);
      } else {
        toast.success("Legajo creado.");
        router.push(`/empresas/${empresaId}/legajos`);
      }
    } else {
      toast.error(state.error);
    }
  }, [state, router, empresaId, modo]);

  function set<K extends keyof typeof campos>(k: K, v: string) {
    setCampos((c) => ({ ...c, [k]: v }));
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="numeroLegajo">N° de legajo</Label>
          <Input
            id="numeroLegajo"
            name="numeroLegajo"
            type="number"
            min="1"
            defaultValue={d.numeroLegajo ?? undefined}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cuil">CUIL</Label>
          <Input
            id="cuil"
            name="cuil"
            placeholder="20-12345678-9"
            value={campos.cuil}
            onChange={(e) => set("cuil", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            value={campos.nombre}
            onChange={(e) => set("nombre", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apellido">Apellido</Label>
          <Input
            id="apellido"
            name="apellido"
            value={campos.apellido}
            onChange={(e) => set("apellido", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
          <Input
            id="fechaNacimiento"
            name="fechaNacimiento"
            type="date"
            defaultValue={d.fechaNacimiento ?? undefined}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fechaIngreso">Fecha de ingreso</Label>
          <Input
            id="fechaIngreso"
            name="fechaIngreso"
            type="date"
            value={campos.fechaIngreso}
            onChange={(e) => set("fechaIngreso", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="categoriaId">Categoría</Label>
          <Select name="categoriaId" value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger id="categoriaId" className="w-full">
              <SelectValue placeholder="Elegí una categoría..." />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {notaCategoria && (
            <p className="text-xs text-amber-600 dark:text-amber-500">{notaCategoria}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tipoContrato">Tipo de contrato</Label>
          <Select name="tipoContrato" value={tipoContrato} onValueChange={setTipoContrato}>
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
          <Select
            name="modalidadRemuneracion"
            value={modalidadRemuneracion}
            onValueChange={setModalidadRemuneracion}
          >
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
          <Input
            id="sueldoBasico"
            name="sueldoBasico"
            type="number"
            step="0.01"
            min="0"
            value={campos.sueldoBasico}
            onChange={(e) => set("sueldoBasico", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="horasSemanales">Horas semanales contratadas (part-time)</Label>
          <Input
            id="horasSemanales"
            name="horasSemanales"
            type="number"
            step="0.5"
            min="0"
            defaultValue={d.horasSemanales != null ? String(d.horasSemanales) : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="horasSemanalesFullTime">Horas semanales full-time (categoría)</Label>
          <Input
            id="horasSemanalesFullTime"
            name="horasSemanalesFullTime"
            type="number"
            step="0.5"
            min="0"
            defaultValue={d.horasSemanalesFullTime != null ? String(d.horasSemanalesFullTime) : 48}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="obraSocial">Obra social (opcional)</Label>
          <Input
            id="obraSocial"
            name="obraSocial"
            value={campos.obraSocial}
            onChange={(e) => set("obraSocial", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="afiliadoSindical"
            name="afiliadoSindical"
            value="true"
            defaultChecked={d.afiliadoSindical ?? false}
          />
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
            <Input
              id="regimenRIFLFechaAlta"
              name="regimenRIFLFechaAlta"
              type="date"
              defaultValue={d.regimenRIFLFechaAlta ?? undefined}
            />
            <p className="text-xs text-muted-foreground">
              Solo tiene efecto en la liquidación si además se carga el porcentaje de reducción de
              contribuciones patronales en Configuración → Tasas (hoy es 0% por defecto, sin
              reglamentar).
            </p>
          </div>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : modo === "editar" ? "Guardar cambios" : "Crear legajo"}
      </Button>
    </form>
  );
}
