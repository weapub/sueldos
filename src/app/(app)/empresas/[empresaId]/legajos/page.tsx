import Link from "next/link";
import { notFound } from "next/navigation";
import { listarLegajosPorEmpresa } from "@/actions/legajos";
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

export default async function LegajosPage({
  params,
}: {
  params: Promise<{ empresaId: string }>;
}) {
  const { empresaId } = await params;
  const empresaResult = await obtenerEmpresa(empresaId);
  if (!empresaResult.ok) notFound();
  const result = await listarLegajosPorEmpresa(empresaId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Legajos — {empresaResult.data.razonSocial}</h1>
          <p className="text-sm text-muted-foreground">Empleados de la empresa.</p>
        </div>
        <Button asChild>
          <Link href={`/empresas/${empresaId}/legajos/nuevo`}>Nuevo legajo</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {!result.ok ? (
            <p className="p-6 text-sm text-destructive">{result.error}</p>
          ) : result.data.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Todavía no hay legajos cargados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Apellido y nombre</TableHead>
                  <TableHead>CUIL</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Sueldo básico</TableHead>
                  <TableHead>Situación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((legajo) => (
                  <TableRow key={legajo.id}>
                    <TableCell>{legajo.numeroLegajo}</TableCell>
                    <TableCell>
                      <Link
                        href={`/empresas/${empresaId}/legajos/${legajo.id}`}
                        className="font-medium hover:underline"
                      >
                        {legajo.apellido}, {legajo.nombre}
                      </Link>
                    </TableCell>
                    <TableCell>{legajo.cuil}</TableCell>
                    <TableCell>{legajo.categoria.nombre}</TableCell>
                    <TableCell>
                      $
                      {Number(legajo.sueldoBasico).toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={legajo.situacion === "ACTIVO" ? "default" : "secondary"}>
                        {legajo.situacion}
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
