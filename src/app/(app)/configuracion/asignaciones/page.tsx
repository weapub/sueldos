import { listarEscalaAsignaciones } from "@/actions/asignaciones";
import { TIPO_ASIGNACION_LABEL } from "@/lib/validation/asignaciones";
import { formatFechaAR } from "@/lib/fecha";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EscalaAsignacionForm } from "./escala-asignacion-form";
import { EliminarFilaButton } from "./eliminar-fila-button";

function fmt(n: unknown) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export default async function AsignacionesPage() {
  const result = await listarEscalaAsignaciones();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Escala de asignaciones familiares (SUAF)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Valores oficiales de ANSES por tipo, tramo de IGF y zona. Uso informativo: las paga
            ANSES directo al trabajador, no integran el recibo.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {!result.ok ? (
            <p className="p-6 text-sm text-destructive">{result.error}</p>
          ) : result.data.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Sin filas cargadas. Agregá la escala vigente de ANSES abajo.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>IGF desde</TableHead>
                  <TableHead>IGF hasta</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Vigente desde</TableHead>
                  <TableHead className="w-[1%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">
                      {TIPO_ASIGNACION_LABEL[f.tipo as keyof typeof TIPO_ASIGNACION_LABEL]}
                    </TableCell>
                    <TableCell>{f.zona}</TableCell>
                    <TableCell>{fmt(f.igfDesde)}</TableCell>
                    <TableCell>{f.igfHasta ? fmt(f.igfHasta) : "sin tope"}</TableCell>
                    <TableCell>{fmt(f.monto)}</TableCell>
                    <TableCell>{formatFechaAR(f.vigenciaDesde)}</TableCell>
                    <TableCell>
                      <EliminarFilaButton id={f.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nueva fila</CardTitle>
        </CardHeader>
        <CardContent>
          <EscalaAsignacionForm />
        </CardContent>
      </Card>
    </div>
  );
}
