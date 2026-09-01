"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearAdelanto, eliminarAdelanto } from "@/actions/adelantos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { formatFechaAR } from "@/lib/fecha";
import type { ActionResult } from "@/actions/empresas";

type Adelanto = {
  id: string;
  fecha: Date | string;
  monto: string;
  observaciones: string | null;
  aplicadoEnLiquidacionId: string | null;
};

function fmtMonto(v: string) {
  return `$${Number(v).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export function AdelantosPanel({
  legajoId,
  adelantos,
}: {
  legajoId: string;
  adelantos: Adelanto[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const hoy = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(hoy);
  const [monto, setMonto] = useState("");
  const [obs, setObs] = useState("");

  const crearAction = crearAdelanto.bind(null, legajoId);
  const [state, formAction, altaPending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(async (prev, fd) => crearAction(prev, fd), null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Adelanto registrado. Se descontará en la próxima liquidación en borrador.");
      /* eslint-disable react-hooks/set-state-in-effect */
      setMonto("");
      setObs("");
      /* eslint-enable react-hooks/set-state-in-effect */
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este adelanto?")) return;
    startTransition(async () => {
      const res = await eliminarAdelanto(id);
      if (res.ok) {
        toast.success("Adelanto eliminado.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  const pendienteTotal = adelantos
    .filter((a) => !a.aplicadoEnLiquidacionId)
    .reduce((acc, a) => acc + Number(a.monto), 0);

  return (
    <div className="space-y-4">
      {adelantos.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Obs.</TableHead>
              <TableHead className="w-[1%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adelantos.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{formatFechaAR(a.fecha)}</TableCell>
                <TableCell className="text-right">{fmtMonto(a.monto)}</TableCell>
                <TableCell>
                  {a.aplicadoEnLiquidacionId ? (
                    <Badge variant="secondary">Descontado</Badge>
                  ) : (
                    <Badge>Pendiente</Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-[16rem] truncate">{a.observaciones ?? "—"}</TableCell>
                <TableCell>
                  {!a.aplicadoEnLiquidacionId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => eliminar(a.id)}
                      aria-label="Eliminar adelanto"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {pendienteTotal > 0 && (
        <p className="text-sm text-muted-foreground">
          Pendiente de descontar: <span className="font-medium">{fmtMonto(String(pendienteTotal))}</span>
        </p>
      )}

      <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-6 items-end">
        <div className="space-y-2">
          <Label htmlFor="a-fecha">Fecha</Label>
          <Input
            id="a-fecha"
            name="fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="a-monto">Monto</Label>
          <Input
            id="a-monto"
            name="monto"
            type="number"
            step="0.01"
            min="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-4">
          <Label htmlFor="a-obs">Observaciones</Label>
          <Input id="a-obs" name="observaciones" value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
        <Button type="submit" size="sm" disabled={altaPending} className="w-fit">
          {altaPending ? "Guardando..." : "Registrar adelanto"}
        </Button>
      </form>
    </div>
  );
}
