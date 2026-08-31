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

export type BasesCalculo = {
  remunerativo: number;
  noRemunerativo: number;
  haberes: number;
  basico: number;
};

type BaseCalculo = "REMUNERATIVO" | "NO_REMUNERATIVO" | "HABERES" | "BASICO";

const BASE_LABEL: Record<BaseCalculo, string> = {
  REMUNERATIVO: "Total remunerativo",
  NO_REMUNERATIVO: "Total no remunerativo",
  HABERES: "Total haberes (rem + no rem)",
  BASICO: "Sueldo básico",
};

const BASE_KEY: Record<BaseCalculo, keyof BasesCalculo> = {
  REMUNERATIVO: "remunerativo",
  NO_REMUNERATIVO: "noRemunerativo",
  HABERES: "haberes",
  BASICO: "basico",
};

function fmt(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export type ConceptoManualInicial = {
  conceptoDefinicionId: string;
  monto: string;
  consentimientoFirmado: boolean;
  porcentaje?: string; // fracción (0.04)
  baseCalculo?: BaseCalculo;
};

export function ConceptoManualDialog({
  liquidacionId,
  catalogo,
  bases,
  indice,
  inicial,
  trigger,
}: {
  liquidacionId: string;
  catalogo: CatalogoItem[];
  bases: BasesCalculo;
  /** Sin `indice` = agregar; con `indice` = editar esa posición de la lista de conceptos manuales. */
  indice?: number;
  inicial?: ConceptoManualInicial;
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const esEdicion = indice != null;
  const [open, setOpen] = useState(false);
  const [conceptoId, setConceptoId] = useState(inicial?.conceptoDefinicionId ?? "");
  const [modo, setModo] = useState<"monto" | "porcentaje">(inicial?.porcentaje ? "porcentaje" : "monto");
  const [monto, setMonto] = useState(inicial?.porcentaje ? "" : (inicial?.monto ?? ""));
  const [pct, setPct] = useState(
    inicial?.porcentaje ? String(Number(inicial.porcentaje) * 100) : "",
  );
  const [baseCalculo, setBaseCalculo] = useState<BaseCalculo>(inicial?.baseCalculo ?? "REMUNERATIVO");
  const [consentimiento, setConsentimiento] = useState(inicial?.consentimientoFirmado ?? false);
  const [pending, startTransition] = useTransition();

  const conceptoSeleccionado = catalogo.find((c) => c.id === conceptoId);
  const baseMonto = bases[BASE_KEY[baseCalculo]] ?? 0;
  const montoDesdePct =
    modo === "porcentaje" && pct !== "" && Number.isFinite(Number(pct))
      ? Math.round(baseMonto * (Number(pct) / 100) * 100) / 100
      : null;

  function reset() {
    setConceptoId(inicial?.conceptoDefinicionId ?? "");
    setModo(inicial?.porcentaje ? "porcentaje" : "monto");
    setMonto(inicial?.porcentaje ? "" : (inicial?.monto ?? ""));
    setPct(inicial?.porcentaje ? String(Number(inicial.porcentaje) * 100) : "");
    setBaseCalculo(inicial?.baseCalculo ?? "REMUNERATIVO");
    setConsentimiento(inicial?.consentimientoFirmado ?? false);
  }

  const invalido =
    !conceptoId ||
    (modo === "monto" ? !monto : pct === "" || !(baseMonto > 0) || montoDesdePct == null);

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

          <div className="flex gap-2">
            <Button
              type="button"
              variant={modo === "monto" ? "default" : "secondary"}
              size="sm"
              onClick={() => setModo("monto")}
            >
              Monto fijo
            </Button>
            <Button
              type="button"
              variant={modo === "porcentaje" ? "default" : "secondary"}
              size="sm"
              onClick={() => setModo("porcentaje")}
            >
              Porcentaje
            </Button>
          </div>

          {modo === "monto" ? (
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
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="pct">Porcentaje (%)</Label>
                  <Input
                    id="pct"
                    type="number"
                    step="0.01"
                    min="0"
                    value={pct}
                    onChange={(e) => setPct(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sobre</Label>
                  <Select value={baseCalculo} onValueChange={(v) => setBaseCalculo(v as BaseCalculo)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(BASE_LABEL) as BaseCalculo[]).map((b) => (
                        <SelectItem key={b} value={b}>
                          {BASE_LABEL[b]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Base {fmt(baseMonto)} ·{" "}
                {montoDesdePct != null ? <span className="font-medium">= {fmt(montoDesdePct)}</span> : "—"}
              </p>
            </div>
          )}

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
            disabled={pending || invalido}
            onClick={() =>
              startTransition(async () => {
                const payload =
                  modo === "monto"
                    ? {
                        conceptoDefinicionId: conceptoId,
                        monto,
                        consentimientoFirmado: consentimiento,
                      }
                    : {
                        conceptoDefinicionId: conceptoId,
                        monto: String(montoDesdePct),
                        porcentaje: String(Number(pct) / 100),
                        baseCalculo,
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
export function AgregarConceptoDialog(props: {
  liquidacionId: string;
  catalogo: CatalogoItem[];
  bases: BasesCalculo;
}) {
  return <ConceptoManualDialog {...props} />;
}
