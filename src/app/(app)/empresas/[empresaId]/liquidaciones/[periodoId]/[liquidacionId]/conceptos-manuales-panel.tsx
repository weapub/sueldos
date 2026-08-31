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
import { ConceptoManualDialog } from "../agregar-concepto-dialog";

type CatalogoItem = { id: string; nombre: string; requiereConsentimiento: boolean };

export type ConceptoManualFila = {
  indice: number;
  conceptoDefinicionId: string;
  nombre: string;
  monto: string;
  consentimientoFirmado: boolean;
};

function fmt(n: unknown) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export function ConceptosManualesPanel({
  liquidacionId,
  conceptos,
  catalogo,
}: {
  liquidacionId: string;
  conceptos: ConceptoManualFila[];
  catalogo: CatalogoItem[];
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
                <TableCell>{c.nombre}</TableCell>
                <TableCell className="text-right">{fmt(c.monto)}</TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <ConceptoManualDialog
                    liquidacionId={liquidacionId}
                    catalogo={catalogo}
                    indice={c.indice}
                    inicial={{
                      conceptoDefinicionId: c.conceptoDefinicionId,
                      monto: c.monto,
                      consentimientoFirmado: c.consentimientoFirmado,
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
      <ConceptoManualDialog liquidacionId={liquidacionId} catalogo={catalogo} />
    </div>
  );
}
