import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerPeriodo, listarCatalogoConceptos } from "@/actions/liquidaciones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PeriodoActions } from "./periodo-actions";
import { AgregarConceptoDialog } from "./agregar-concepto-dialog";

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function fmt(n: unknown) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export default async function PeriodoDetailPage({
  params,
}: {
  params: Promise<{ empresaId: string; periodoId: string }>;
}) {
  const { empresaId, periodoId } = await params;
  const [periodoResult, catalogoResult] = await Promise.all([
    obtenerPeriodo(periodoId),
    listarCatalogoConceptos(empresaId),
  ]);
  if (!periodoResult.ok) notFound();
  const periodo = periodoResult.data;
  const catalogo = catalogoResult.ok ? catalogoResult.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {MESES[periodo.mes]} {periodo.anio} — {periodo.empresa.razonSocial}
          </h1>
          <Badge variant={periodo.estado === "BORRADOR" ? "secondary" : "default"} className="mt-1">
            {periodo.estado}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {periodo.liquidaciones.length > 0 && (
            <>
              <Button asChild variant="secondary">
                <a href={`/api/sicoss/${periodoId}`} target="_blank" rel="noreferrer">
                  Descargar SICOSS
                </a>
              </Button>
              <Button asChild variant="secondary">
                <a href={`/api/lsd/${periodoId}`} target="_blank" rel="noreferrer">
                  Descargar LSD
                </a>
              </Button>
            </>
          )}
          <PeriodoActions periodoId={periodoId} estado={periodo.estado} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liquidaciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {periodo.liquidaciones.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Todavía no se calculó ninguna liquidación. Usá &quot;Calcular período&quot; para
              generar las liquidaciones de todos los legajos activos.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Legajo</TableHead>
                  <TableHead>Remunerativo</TableHead>
                  <TableHead>No remunerativo</TableHead>
                  <TableHead>Deducciones</TableHead>
                  <TableHead>Neto</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodo.liquidaciones.map((liq) => (
                  <TableRow key={liq.id}>
                    <TableCell>
                      <Link
                        href={`/empresas/${empresaId}/liquidaciones/${periodoId}/${liq.id}`}
                        className="font-medium hover:underline"
                      >
                        {liq.legajo.apellido}, {liq.legajo.nombre}
                      </Link>
                    </TableCell>
                    <TableCell>{fmt(liq.totalRemunerativo)}</TableCell>
                    <TableCell>{fmt(liq.totalNoRemunerativo)}</TableCell>
                    <TableCell>{fmt(liq.totalDeducciones)}</TableCell>
                    <TableCell className="font-medium">{fmt(liq.neto)}</TableCell>
                    <TableCell>
                      {periodo.estado === "BORRADOR" && (
                        <AgregarConceptoDialog liquidacionId={liq.id} catalogo={catalogo} />
                      )}
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
