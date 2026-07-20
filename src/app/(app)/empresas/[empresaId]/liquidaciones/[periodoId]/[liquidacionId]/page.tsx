import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireEmpresaAccess } from "@/lib/authz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

function fmt(n: unknown) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export default async function ReciboPage({
  params,
}: {
  params: Promise<{ empresaId: string; periodoId: string; liquidacionId: string }>;
}) {
  const { liquidacionId } = await params;
  const liquidacion = await db.liquidacionMensual.findUnique({
    where: { id: liquidacionId },
    include: {
      legajo: { include: { empresa: true, categoria: true } },
      periodo: true,
      conceptos: { include: { conceptoDefinicion: true }, orderBy: { orden: "asc" } },
    },
  });
  if (!liquidacion) notFound();
  await requireEmpresaAccess(liquidacion.legajo.empresaId);

  const haberes = liquidacion.conceptos.filter((c) => c.conceptoDefinicion.tipo !== "DEDUCCION");
  const deducciones = liquidacion.conceptos.filter((c) => c.conceptoDefinicion.tipo === "DEDUCCION");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Recibo de sueldo — {liquidacion.legajo.apellido}, {liquidacion.legajo.nombre}
          </h1>
          <p className="text-sm text-muted-foreground">
            {MESES[liquidacion.periodo.mes]} {liquidacion.periodo.anio} — {liquidacion.legajo.empresa.razonSocial}
          </p>
        </div>
        <Button asChild variant="secondary">
          <a href={`/api/recibo/${liquidacion.id}/pdf`} target="_blank" rel="noreferrer">
            Descargar PDF
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos (art. 140)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">CUIT empleador</p>
            <p>{liquidacion.legajo.empresa.cuit}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">CUIL trabajador</p>
            <p>{liquidacion.legajo.cuil}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Categoría</p>
            <p>{liquidacion.legajo.categoria.nombre}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Días trabajados</p>
            <p>{liquidacion.diasTrabajados}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Haberes</CardTitle>
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
                {haberes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.descripcion}</TableCell>
                    <TableCell className="text-right">{fmt(c.monto)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deducciones</CardTitle>
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
                {deducciones.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.descripcion}</TableCell>
                    <TableCell className="text-right">{fmt(c.monto)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Total remunerativo</p>
            <p className="font-medium">{fmt(liquidacion.totalRemunerativo)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total no remunerativo</p>
            <p className="font-medium">{fmt(liquidacion.totalNoRemunerativo)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Contribuciones patronales</p>
            <p className="font-medium">{fmt(liquidacion.totalContribucionesPatronales)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Neto a cobrar</p>
            <p className="text-lg font-semibold">{fmt(liquidacion.neto)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
