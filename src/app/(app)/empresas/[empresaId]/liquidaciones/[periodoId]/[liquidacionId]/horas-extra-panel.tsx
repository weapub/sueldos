"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  agregarHorasExtra,
  editarHorasExtra,
  eliminarHorasExtra,
} from "@/actions/liquidaciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

type Recargo = 50 | 100;
type Modalidad = "PAGO" | "BANCO_HORAS" | "FRANCO_COMPENSATORIO";

export type HoraExtraFila = {
  indice: number;
  horas: string;
  recargo: Recargo;
  modalidad: Modalidad;
};

const MODALIDAD_LABEL: Record<Modalidad, string> = {
  PAGO: "Se paga",
  BANCO_HORAS: "Banco de horas",
  FRANCO_COMPENSATORIO: "Franco compensatorio",
};

function HorasExtraDialog({
  liquidacionId,
  indice,
  inicial,
  trigger,
}: {
  liquidacionId: string;
  indice?: number;
  inicial?: { horas: string; recargo: Recargo; modalidad: Modalidad };
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const esEdicion = indice != null;
  const [open, setOpen] = useState(false);
  const [horas, setHoras] = useState(inicial?.horas ?? "");
  const [recargo, setRecargo] = useState<Recargo>(inicial?.recargo ?? 50);
  const [modalidad, setModalidad] = useState<Modalidad>(inicial?.modalidad ?? "PAGO");
  const [pending, startTransition] = useTransition();

  function reset() {
    setHoras(inicial?.horas ?? "");
    setRecargo(inicial?.recargo ?? 50);
    setModalidad(inicial?.modalidad ?? "PAGO");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm">
            + Horas extra
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar horas extra" : "Agregar horas extra"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="he-horas">Cantidad de horas</Label>
            <Input
              id="he-horas"
              type="number"
              step="0.5"
              min="0"
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Recargo</Label>
              <Select
                value={String(recargo)}
                onValueChange={(v) => setRecargo(Number(v) as Recargo)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50% (día hábil / sábado a.m.)</SelectItem>
                  <SelectItem value="100">100% (sábado p.m. / domingo / feriado)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modalidad</Label>
              <Select value={modalidad} onValueChange={(v) => setModalidad(v as Modalidad)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MODALIDAD_LABEL) as Modalidad[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {MODALIDAD_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {modalidad !== "PAGO" && (
            <p className="text-xs text-muted-foreground">
              A banco de horas / franco compensatorio no se paga en este período (art. 197 bis).
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={pending || !horas || Number(horas) <= 0}
            onClick={() =>
              startTransition(async () => {
                const payload = { horas: Number(horas), recargo, modalidad };
                const res = esEdicion
                  ? await editarHorasExtra(liquidacionId, indice, payload)
                  : await agregarHorasExtra(liquidacionId, payload);
                if (res.ok) {
                  toast.success(esEdicion ? "Horas extra actualizadas." : "Horas extra agregadas.");
                  setOpen(false);
                  if (!esEdicion) reset();
                  router.refresh();
                } else {
                  toast.error(res.error);
                }
              })
            }
          >
            {pending ? "Guardando..." : esEdicion ? "Guardar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HorasExtraPanel({
  liquidacionId,
  horasExtra,
}: {
  liquidacionId: string;
  horasExtra: HoraExtraFila[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function eliminar(indice: number) {
    if (!window.confirm("¿Eliminar este registro de horas extra?")) return;
    startTransition(async () => {
      const res = await eliminarHorasExtra(liquidacionId, indice);
      if (res.ok) {
        toast.success("Registro eliminado.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      {horasExtra.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin horas extra en esta liquidación.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Horas</TableHead>
              <TableHead>Recargo</TableHead>
              <TableHead>Modalidad</TableHead>
              <TableHead className="w-[1%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {horasExtra.map((h) => (
              <TableRow key={h.indice}>
                <TableCell>{h.horas}</TableCell>
                <TableCell>{h.recargo}%</TableCell>
                <TableCell>{MODALIDAD_LABEL[h.modalidad]}</TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <HorasExtraDialog
                    liquidacionId={liquidacionId}
                    indice={h.indice}
                    inicial={{ horas: h.horas, recargo: h.recargo, modalidad: h.modalidad }}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => eliminar(h.indice)}
                    aria-label="Eliminar horas extra"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <HorasExtraDialog liquidacionId={liquidacionId} />
    </div>
  );
}
