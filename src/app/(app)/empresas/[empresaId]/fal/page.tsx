import { notFound } from "next/navigation";
import { obtenerEmpresa } from "@/actions/empresas";
import { listarMovimientosFal } from "@/actions/fal";
import { formatFechaAR } from "@/lib/fecha";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MOVIMIENTO_LABEL: Record<string, string> = {
  CONTRIBUCION_MENSUAL: "Contribución mensual",
  RETIRO_INDEMNIZACION: "Retiro por indemnización",
  AJUSTE: "Ajuste",
};

function fmt(n: unknown) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export default async function FalPage({
  params,
}: {
  params: Promise<{ empresaId: string }>;
}) {
  const { empresaId } = await params;
  const empresaResult = await obtenerEmpresa(empresaId);
  if (!empresaResult.ok) notFound();
  const result = await listarMovimientosFal(empresaId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Fondo de Asistencia Laboral — {empresaResult.data.razonSocial}</h1>
        <p className="text-sm text-muted-foreground">Título II, Ley 27.802.</p>
      </div>

      {!result.ok ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : !result.data ? (
        <p className="text-sm text-muted-foreground">
          Todavía no se devengó ninguna contribución al FAL para esta empresa (vigente desde el
          1/6/2026, se acredita automáticamente al confirmar un período de liquidación).
        </p>
      ) : (
        <>
          <Card>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <p className="text-xs text-muted-foreground">Alta del fondo</p>
                <p>{formatFechaAR(result.data.fechaAlta)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Saldo actual</p>
                <p className="text-2xl font-semibold">{fmt(result.data.saldoActual)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Movimientos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {result.data.movimientos.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Sin movimientos todavía.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.data.movimientos.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{formatFechaAR(m.fecha)}</TableCell>
                        <TableCell>
                          <Badge variant={m.tipo === "CONTRIBUCION_MENSUAL" ? "default" : "secondary"}>
                            {MOVIMIENTO_LABEL[m.tipo]}
                          </Badge>
                        </TableCell>
                        <TableCell>{m.descripcion ?? "—"}</TableCell>
                        <TableCell className="text-right">{fmt(m.monto)}</TableCell>
                        <TableCell className="text-right">{fmt(m.saldoResultante)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
