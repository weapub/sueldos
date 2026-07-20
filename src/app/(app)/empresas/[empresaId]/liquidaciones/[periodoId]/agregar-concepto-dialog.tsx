"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { agregarConceptoManual } from "@/actions/liquidaciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";

type CatalogoItem = { id: string; nombre: string; requiereConsentimiento: boolean };

export function AgregarConceptoDialog({
  liquidacionId,
  catalogo,
}: {
  liquidacionId: string;
  catalogo: CatalogoItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [conceptoId, setConceptoId] = useState<string>("");
  const [monto, setMonto] = useState("");
  const [consentimiento, setConsentimiento] = useState(false);
  const [pending, startTransition] = useTransition();

  const conceptoSeleccionado = catalogo.find((c) => c.id === conceptoId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          + Concepto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar concepto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Concepto</Label>
            <Select value={conceptoId} onValueChange={setConceptoId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Elegí un concepto" />
              </SelectTrigger>
              <SelectContent>
                {catalogo.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="monto">Monto</Label>
            <Input id="monto" type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} />
          </div>
          {conceptoSeleccionado?.requiereConsentimiento && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="consentimiento"
                checked={consentimiento}
                onCheckedChange={(v) => setConsentimiento(v === true)}
              />
              <Label htmlFor="consentimiento" className="font-normal">
                El trabajador firmó el consentimiento explícito (art. 133).
              </Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={pending || !conceptoId || !monto}
            onClick={() =>
              startTransition(async () => {
                const result = await agregarConceptoManual(liquidacionId, {
                  conceptoDefinicionId: conceptoId,
                  monto,
                  consentimientoFirmado: consentimiento,
                });
                if (result.ok) {
                  toast.success("Concepto agregado.");
                  setOpen(false);
                  setConceptoId("");
                  setMonto("");
                  setConsentimiento(false);
                  router.refresh();
                } else {
                  toast.error(result.error);
                }
              })
            }
          >
            {pending ? "Guardando..." : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
