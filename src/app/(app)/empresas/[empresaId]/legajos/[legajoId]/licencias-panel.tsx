"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearLicencia, eliminarLicencia } from "@/actions/licencias";
import {
  tipoLicenciaValues,
  TIPO_LICENCIA_LABEL,
  CON_GOCE_DEFAULT,
} from "@/lib/validation/licencias";
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

type Licencia = {
  id: string;
  tipo: string;
  desde: Date | string;
  hasta: Date | string;
  conGoce: boolean;
  observaciones: string | null;
};

export function LicenciasPanel({
  legajoId,
  licencias,
}: {
  legajoId: string;
  licencias: Licencia[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [tipo, setTipo] = useState<(typeof tipoLicenciaValues)[number]>("ENFERMEDAD_INCULPABLE");
  const [conGoce, setConGoce] = useState(CON_GOCE_DEFAULT["ENFERMEDAD_INCULPABLE"]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [obs, setObs] = useState("");

  const crearAction = crearLicencia.bind(null, legajoId);
  const [state, formAction, altaPending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(async (prev, fd) => crearAction(prev, fd), null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Licencia registrada.");
      /* eslint-disable react-hooks/set-state-in-effect */
      setDesde("");
      setHasta("");
      setObs("");
      /* eslint-enable react-hooks/set-state-in-effect */
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  function cambiarTipo(t: (typeof tipoLicenciaValues)[number]) {
    setTipo(t);
    setConGoce(CON_GOCE_DEFAULT[t]);
  }

  function eliminar(id: string) {
    if (!window.confirm("¿Eliminar esta licencia?")) return;
    startTransition(async () => {
      const res = await eliminarLicencia(id);
      if (res.ok) {
        toast.success("Licencia eliminada.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {licencias.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead>Hasta</TableHead>
              <TableHead>Goce</TableHead>
              <TableHead>Obs.</TableHead>
              <TableHead className="w-[1%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {licencias.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  {TIPO_LICENCIA_LABEL[l.tipo as keyof typeof TIPO_LICENCIA_LABEL] ?? l.tipo}
                </TableCell>
                <TableCell>{formatFechaAR(l.desde)}</TableCell>
                <TableCell>{formatFechaAR(l.hasta)}</TableCell>
                <TableCell>{l.conGoce ? "Con goce" : "Sin goce"}</TableCell>
                <TableCell className="max-w-[16rem] truncate">{l.observaciones ?? "—"}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => eliminar(l.id)}
                    aria-label="Eliminar licencia"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-6 items-end">
        <input type="hidden" name="conGoce" value={conGoce ? "true" : ""} />
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="l-tipo">Tipo</Label>
          <Select
            name="tipo"
            value={tipo}
            onValueChange={(v) => cambiarTipo(v as (typeof tipoLicenciaValues)[number])}
          >
            <SelectTrigger id="l-tipo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tipoLicenciaValues.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_LICENCIA_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="l-desde">Desde</Label>
          <Input
            id="l-desde"
            name="desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="l-hasta">Hasta</Label>
          <Input
            id="l-hasta"
            name="hasta"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            required
          />
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Checkbox
            id="l-goce"
            checked={conGoce}
            onCheckedChange={(v) => setConGoce(v === true)}
          />
          <Label htmlFor="l-goce" className="font-normal">
            Con goce de haberes
          </Label>
        </div>
        <div className="space-y-2 sm:col-span-5">
          <Label htmlFor="l-obs">Observaciones</Label>
          <Input id="l-obs" name="observaciones" value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
        <Button type="submit" size="sm" disabled={altaPending} className="w-fit">
          {altaPending ? "Guardando..." : "Registrar licencia"}
        </Button>
      </form>
    </div>
  );
}
