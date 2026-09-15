import { listarMovimientosFondoCese } from "@/actions/fondoCese";
import { formatFechaAR } from "@/lib/fecha";
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
  DEPOSITO_MENSUAL: "Depósito mensual",
  RETIRO_CESE: "Retiro al cese",
  AJUSTE: "Ajuste",
};

function fmt(n: unknown) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

/** Panel de solo lectura: el saldo se devenga solo al confirmar cada período, no se edita a mano. */
export async function FondoCesePanel({ legajoId }: { legajoId: string }) {
  const result = await listarMovimientosFondoCese(legajoId);

  if (!result.ok) {
    return <p className="text-sm text-destructive">{result.error}</p>;
  }
  if (!result.data) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no se devengó ningún depósito para este legajo — se acredita automáticamente al
        confirmar un período de liquidación.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-xs text-muted-foreground">Alta de la cuenta</p>
          <p>{formatFechaAR(result.data.fechaAlta)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Saldo actual</p>
          <p className="text-2xl font-semibold">{fmt(result.data.saldoActual)}</p>
        </div>
      </div>

      {result.data.movimientos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin movimientos todavía.</p>
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
                  <Badge variant={m.tipo === "DEPOSITO_MENSUAL" ? "success" : "secondary"}>
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
    </div>
  );
}
