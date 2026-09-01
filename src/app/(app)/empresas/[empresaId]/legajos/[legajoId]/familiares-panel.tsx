"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  crearFamiliar,
  eliminarFamiliar,
  actualizarDatosAsignaciones,
} from "@/actions/asignaciones";
import {
  vinculoFamiliarValues,
  VINCULO_FAMILIAR_LABEL,
} from "@/lib/validation/asignaciones";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { formatFechaAR } from "@/lib/fecha";
import type { ActionResult } from "@/actions/empresas";

type Familiar = {
  id: string;
  nombre: string;
  vinculo: string;
  fechaNacimiento: Date | string | null;
  enEscolaridad: boolean;
};

export function FamiliaresPanel({
  legajoId,
  familiares,
  conyugeEmbarazada,
  igfDeclarado,
  zonaAsignacion,
}: {
  legajoId: string;
  familiares: Familiar[];
  conyugeEmbarazada: boolean;
  igfDeclarado: string | null;
  zonaAsignacion: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // --- datos de asignaciones del legajo ---
  const [embarazada, setEmbarazada] = useState(conyugeEmbarazada);
  const [igf, setIgf] = useState(igfDeclarado ?? "");
  const [zona, setZona] = useState(zonaAsignacion);

  function guardarDatos() {
    startTransition(async () => {
      const res = await actualizarDatosAsignaciones(legajoId, {
        conyugeEmbarazada: embarazada,
        igfDeclarado: igf || null,
        zonaAsignacion: zona,
      });
      if (res.ok) {
        toast.success("Datos guardados.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  // --- alta de familiar ---
  const [nombre, setNombre] = useState("");
  const [vinculo, setVinculo] = useState<string>("HIJO");
  const [nac, setNac] = useState("");
  const [escuela, setEscuela] = useState(false);
  const crearAction = crearFamiliar.bind(null, legajoId);
  const [state, formAction, altaPending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(async (prev, fd) => crearAction(prev, fd), null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Familiar agregado.");
      // Reset del form tras el alta: one-shot post round-trip, no un loop de renders.
      /* eslint-disable react-hooks/set-state-in-effect */
      setNombre("");
      setVinculo("HIJO");
      setNac("");
      setEscuela(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  function eliminar(id: string, nom: string) {
    if (!window.confirm(`¿Eliminar a "${nom}"?`)) return;
    startTransition(async () => {
      const res = await eliminarFamiliar(id);
      if (res.ok) {
        toast.success("Familiar eliminado.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="igf">IGF declarado (opcional)</Label>
          <Input
            id="igf"
            type="number"
            step="0.01"
            min="0"
            placeholder="usa el remunerativo del período"
            value={igf}
            onChange={(e) => setIgf(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zona">Zona</Label>
          <Input id="zona" value={zona} onChange={(e) => setZona(e.target.value)} />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox
            id="embarazada"
            checked={embarazada}
            onCheckedChange={(v) => setEmbarazada(v === true)}
          />
          <Label htmlFor="embarazada" className="font-normal">
            Cónyuge embarazada (prenatal)
          </Label>
        </div>
        <div className="sm:col-span-3">
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={guardarDatos}>
            {pending ? "Guardando..." : "Guardar datos de asignaciones"}
          </Button>
        </div>
      </div>

      {familiares.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Vínculo</TableHead>
              <TableHead>Nacimiento</TableHead>
              <TableHead>Escolaridad</TableHead>
              <TableHead className="w-[1%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {familiares.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.nombre}</TableCell>
                <TableCell>
                  {VINCULO_FAMILIAR_LABEL[f.vinculo as keyof typeof VINCULO_FAMILIAR_LABEL] ??
                    f.vinculo}
                </TableCell>
                <TableCell>{f.fechaNacimiento ? formatFechaAR(f.fechaNacimiento) : "—"}</TableCell>
                <TableCell>{f.enEscolaridad ? "Sí" : "—"}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => eliminar(f.id, f.nombre)}
                    aria-label={`Eliminar ${f.nombre}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-5 items-end">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="f-nombre">Nombre</Label>
          <Input
            id="f-nombre"
            name="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="f-vinculo">Vínculo</Label>
          <Select name="vinculo" value={vinculo} onValueChange={setVinculo}>
            <SelectTrigger id="f-vinculo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {vinculoFamiliarValues.map((v) => (
                <SelectItem key={v} value={v}>
                  {VINCULO_FAMILIAR_LABEL[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="f-nac">Nacimiento</Label>
          <Input
            id="f-nac"
            name="fechaNacimiento"
            type="date"
            value={nac}
            onChange={(e) => setNac(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Checkbox
            id="f-escuela"
            name="enEscolaridad"
            value="true"
            checked={escuela}
            onCheckedChange={(v) => setEscuela(v === true)}
          />
          <Label htmlFor="f-escuela" className="font-normal">
            En escolaridad
          </Label>
        </div>
        <Button type="submit" size="sm" disabled={altaPending} className="sm:col-span-5 w-fit">
          {altaPending ? "Guardando..." : "Agregar familiar"}
        </Button>
      </form>
    </div>
  );
}
