import Link from "next/link";
import { notFound } from "next/navigation";
import { listarDesvinculaciones } from "@/actions/desvinculaciones";
import { obtenerEmpresa } from "@/actions/empresas";
import { MOTIVO_LABEL } from "@/lib/validation/desvinculaciones";
import { formatFechaAR } from "@/lib/fecha";
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

export default async function DesvinculacionesPage({
  params,
}: {
  params: Promise<{ empresaId: string }>;
}) {
  const { empresaId } = await params;
  const empresaResult = await obtenerEmpresa(empresaId);
  if (!empresaResult.ok) notFound();
  const result = await listarDesvinculaciones(empresaId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Desvinculaciones — {empresaResult.data.razonSocial}</h1>
          <p className="text-sm text-muted-foreground">Cálculo de indemnizaciones (Ley 27.802).</p>
        </div>
        <Button asChild>
          <Link href={`/empresas/${empresaId}/desvinculaciones/nueva`}>Nueva desvinculación</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {!result.ok ? (
            <p className="p-6 text-sm text-destructive">{result.error}</p>
          ) : result.data.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Todavía no hay desvinculaciones registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Legajo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Fecha de egreso</TableHead>
                  <TableHead>Monto total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((evento) => (
                  <TableRow key={evento.id}>
                    <TableCell>
                      <Link
                        href={`/empresas/${empresaId}/desvinculaciones/${evento.id}`}
                        className="font-medium hover:underline"
                      >
                        {evento.legajo.apellido}, {evento.legajo.nombre}
                      </Link>
                    </TableCell>
                    <TableCell>{MOTIVO_LABEL[evento.motivo]}</TableCell>
                    <TableCell>{formatFechaAR(evento.fechaEgreso)}</TableCell>
                    <TableCell>
                      ${Number(evento.montoTotal).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={evento.estado === "BORRADOR" ? "secondary" : "default"}>
                        {evento.estado}
                      </Badge>
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
