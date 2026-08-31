"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { eliminarConceptoManual } from "@/actions/liquidaciones";
import { Button } from "@/components/ui/button";
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
import { ConceptoManualDialog, type BasesCalculo } from "../agregar-concepto-dialog";

type CatalogoItem = { id: string; nombre: string; requiereConsentimiento: boolean };

export type ConceptoManualFila = {
  indice: number;
  conceptoDefinicionId: string;
  nombre: string;
  monto: string;
  consentimientoFirmado: boolean;
  porcentaje?: string;
  baseCalculo?: "REMUNERATIVO" | "NO_REMUNERATIVO" | "HABERES" | "BASICO";
};

function fmt(n: unknown) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export function ConceptosManualesPanel({
  liquidacionId,
  conceptos,
  catalogo,
  bases,
}: {
  liquidacionId: string;
  conceptos: ConceptoManualFila[];
  catalogo: CatalogoItem[];
  bases: BasesCalculo;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function eliminar(indice: number, nombre: string) {
    if (!window.confirm(`¿Eliminar el concepto "${nombre}"?`)) return;
    startTransition(async () => {
      const res = await eliminarConceptoManual(liquidacionId, indice);
      if (res.ok) {
        toast.success("Concepto eliminado.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      {conceptos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin conceptos manuales en esta liquidación.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Concepto</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="w-[1%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conceptos.map((c) => (
              <TableRow key={c.indice}>
                <TableCell>
                  {c.nombre}
                  {c.porcentaje && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {(Number(c.porcentaje) * 100).toLocaleString("es-AR", {
                        maximumFractionDigits: 2,
                      })}
                      %
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">{fmt(c.monto)}</TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <ConceptoManualDialog
                    liquidacionId={liquidacionId}
                    catalogo={catalogo}
                    bases={bases}
                    indice={c.indice}
                    inicial={{
                      conceptoDefinicionId: c.conceptoDefinicionId,
                      monto: c.monto,
                      consentimientoFirmado: c.consentimientoFirmado,
                      porcentaje: c.porcentaje,
                      baseCalculo: c.baseCalculo,
                    }}
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
                    onClick={() => eliminar(c.indice, c.nombre)}
                    aria-label={`Eliminar ${c.nombre}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <ConceptoManualDialog liquidacionId={liquidacionId} catalogo={catalogo} bases={bases} />
    </div>
  );
}
