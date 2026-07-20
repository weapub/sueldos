import { listarTasasVigentes } from "@/actions/configuracion";
import { CLAVE_TASA_LABEL, CLAVES_MONTO_FIJO } from "@/lib/validation/tasas";
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
import { TasaForm } from "./tasa-form";

export default async function TasasPage() {
  const result = await listarTasasVigentes();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tasas vigentes (global)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!result.ok ? (
            <p className="p-6 text-sm text-destructive">{result.error}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vigente desde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((tasa) => (
                  <TableRow key={tasa.id}>
                    <TableCell className="font-medium">
                      {CLAVE_TASA_LABEL[tasa.clave as keyof typeof CLAVE_TASA_LABEL]}
                    </TableCell>
                    <TableCell>
                      {CLAVES_MONTO_FIJO.has(tasa.clave as keyof typeof CLAVE_TASA_LABEL)
                        ? `$${Number(tasa.valor).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                        : `${(Number(tasa.valor) * 100).toFixed(3)}%`}
                    </TableCell>
                    <TableCell>{formatFechaAR(tasa.vigenciaDesde)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nueva versión de tasa</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cargar una nueva versión cierra automáticamente la vigencia de la anterior — nunca se
            modifica el histórico.
          </p>
        </CardHeader>
        <CardContent>
          <TasaForm />
        </CardContent>
      </Card>
    </div>
  );
}
