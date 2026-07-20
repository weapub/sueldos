import Link from "next/link";
import { notFound } from "next/navigation";
import { listarPeriodos } from "@/actions/liquidaciones";
import { obtenerEmpresa } from "@/actions/empresas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function LiquidacionesPage({
  params,
}: {
  params: Promise<{ empresaId: string }>;
}) {
  const { empresaId } = await params;
  const empresaResult = await obtenerEmpresa(empresaId);
  if (!empresaResult.ok) notFound();
  const result = await listarPeriodos(empresaId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Liquidaciones — {empresaResult.data.razonSocial}</h1>
          <p className="text-sm text-muted-foreground">Períodos de liquidación mensual.</p>
        </div>
        <Button asChild>
          <Link href={`/empresas/${empresaId}/liquidaciones/nueva`}>Nuevo período</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {!result.ok ? (
            <p className="p-6 text-sm text-destructive">{result.error}</p>
          ) : result.data.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Todavía no hay períodos creados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Legajos liquidados</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/empresas/${empresaId}/liquidaciones/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        {MESES[p.mes]} {p.anio}
                      </Link>
                    </TableCell>
                    <TableCell>{p._count.liquidaciones}</TableCell>
                    <TableCell>
                      <Badge variant={p.estado === "BORRADOR" ? "secondary" : "default"}>{p.estado}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
