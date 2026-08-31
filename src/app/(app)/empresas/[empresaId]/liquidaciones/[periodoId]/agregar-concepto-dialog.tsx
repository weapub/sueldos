"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { agregarConceptoManual, editarConceptoManual } from "@/actions/liquidaciones";
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

export function ConceptoManualDialog({
  liquidacionId,
  catalogo,
  indice,
  inicial,
  trigger,
}: {
  liquidacionId: string;
  catalogo: CatalogoItem[];
  /** Sin `indice` = agregar; con `indice` = editar esa posición de la lista de conceptos manuales. */
  indice?: number;
  inicial?: { conceptoDefinicionId: string; monto: string; consentimientoFirmado: boolean };
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const esEdicion = indice != null;
  const [open, setOpen] = useState(false);
  const [conceptoId, setConceptoId] = useState(inicial?.conceptoDefinicionId ?? "");
  const [monto, setMonto] = useState(inicial?.monto ?? "");
  const [consentimiento, setConsentimiento] = useState(inicial?.consentimientoFirmado ?? false);
  const [pending, startTransition] = useTransition();

  const conceptoSeleccionado = catalogo.find((c) => c.id === conceptoId);

  function reset() {
    setConceptoId(inicial?.conceptoDefinicionId ?? "");
    setMonto(inicial?.monto ?? "");
    setConsentimiento(inicial?.consentimientoFirmado ?? false);
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
            + Concepto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar concepto" : "Agregar concepto"}</DialogTitle>
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
            <Input
              id="monto"
              type="number"
              step="0.01"
              min="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
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
                const payload = {
                  conceptoDefinicionId: conceptoId,
                  monto,
                  consentimientoFirmado: consentimiento,
                };
                const result = esEdicion
                  ? await editarConceptoManual(liquidacionId, indice, payload)
                  : await agregarConceptoManual(liquidacionId, payload);
                if (result.ok) {
                  toast.success(esEdicion ? "Concepto actualizado." : "Concepto agregado.");
                  setOpen(false);
                  if (!esEdicion) reset();
                  router.refresh();
                } else {
                  toast.error(result.error);
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

/** Compat: botón de "+ Concepto" en la tabla del período. */
export function AgregarConceptoDialog(props: { liquidacionId: string; catalogo: CatalogoItem[] }) {
  return <ConceptoManualDialog {...props} />;
}
