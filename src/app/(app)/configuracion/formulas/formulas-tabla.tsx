"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CLAVE_TASA_LABEL, type claveTasaValues } from "@/lib/validation/tasas";
import { TasaForm } from "../tasas/tasa-form";
import type { SegmentoFormulaResuelto } from "@/actions/configuracion";

type ClaveTasaKey = (typeof claveTasaValues)[number];

type Item = {
  codigo: string;
  nombre: string;
  segmentos: SegmentoFormulaResuelto[];
};

export function FormulasTabla({ items }: { items: Item[] }) {
  const [claveEnEdicion, setClaveEnEdicion] = useState<ClaveTasaKey | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/3">Concepto</TableHead>
            <TableHead>Fórmula</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.codigo}>
              <TableCell className="align-top font-medium whitespace-normal">{item.nombre}</TableCell>
              <TableCell className="align-top leading-relaxed whitespace-normal">
                {item.segmentos.map((s, i) =>
                  s.tipo === "texto" ? (
                    <span key={i}>{s.texto}</span>
                  ) : (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setClaveEnEdicion(s.clave)}
                      title={`Editar "${s.label}"`}
                      className="mx-0.5 inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                    >
                      {s.valorFormateado}
                    </button>
                  ),
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={claveEnEdicion !== null} onOpenChange={(open) => !open && setClaveEnEdicion(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{claveEnEdicion ? CLAVE_TASA_LABEL[claveEnEdicion] : ""}</DialogTitle>
            <DialogDescription>
              Cargar una nueva versión cierra automáticamente la vigencia de la anterior — nunca
              se modifica el histórico.
            </DialogDescription>
          </DialogHeader>
          {claveEnEdicion && (
            <TasaForm defaultClave={claveEnEdicion} onSaved={() => setClaveEnEdicion(null)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
