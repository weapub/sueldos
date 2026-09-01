"use client";

import { useState, useTransition } from "react";
import { resolverBrutoDesdeNeto, type NetoBrutoResultado } from "@/actions/herramientas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function fmt(n: unknown) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export function NetoBrutoForm({
  empresaId,
  categorias,
}: {
  empresaId: string;
  categorias: { id: string; nombre: string }[];
}) {
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? "");
  const [neto, setNeto] = useState("");
  const [dias, setDias] = useState("30");
  const [antig, setAntig] = useState("0");
  const [afiliado, setAfiliado] = useState("false");
  const [res, setRes] = useState<NetoBrutoResultado | null>(null);
  const [pending, startTransition] = useTransition();

  function calcular() {
    startTransition(async () => {
      const r = await resolverBrutoDesdeNeto(empresaId, {
        categoriaId,
        netoObjetivo: Number(neto),
        diasTrabajados: Number(dias),
        antiguedadAnios: Number(antig),
        afiliadoSindical: afiliado === "true",
      });
      if (r.ok) {
        setRes(r.data);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-5 items-end">
        <div className="space-y-2 sm:col-span-2">
          <Label>Categoría</Label>
          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="nb-neto">Neto objetivo</Label>
          <Input id="nb-neto" type="number" step="0.01" min="0" value={neto} onChange={(e) => setNeto(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nb-dias">Días trabajados</Label>
          <Input id="nb-dias" type="number" min="1" value={dias} onChange={(e) => setDias(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nb-antig">Antigüedad (años)</Label>
          <Input id="nb-antig" type="number" min="0" value={antig} onChange={(e) => setAntig(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Afiliado sindical</Label>
          <Select value={afiliado} onValueChange={setAfiliado}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">No</SelectItem>
              <SelectItem value="true">Sí</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={calcular} disabled={pending || !neto}>
          {pending ? "Calculando..." : "Calcular bruto"}
        </Button>
      </div>

      {res && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Sueldo básico ≈ {fmt(res.sueldoBasico)}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Remunerativo {fmt(res.totalRemunerativo)} · No remunerativo{" "}
              {fmt(res.totalNoRemunerativo)} · Deducciones {fmt(res.totalDeducciones)} ·{" "}
              <span className="font-medium">Neto {fmt(res.neto)}</span>
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {res.conceptos.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      {c.esDeduccion ? "− " : ""}
                      {c.descripcion}
                      {c.porcentaje &&
                        ` (${(Number(c.porcentaje) * 100).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%)`}
                    </TableCell>
                    <TableCell className="text-right">{fmt(c.monto)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
