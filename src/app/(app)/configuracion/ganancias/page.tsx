import { listarParametrosGanancias } from "@/actions/ganancias";
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
import { ParametroForm, TramoForm, EliminarBtn } from "./ganancias-forms";

function fmt(n: unknown) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export default async function GananciasPage() {
  const result = await listarParametrosGanancias();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Impuesto a las Ganancias — parámetros</CardTitle>
          <p className="text-sm text-muted-foreground">
            Valores ANUALES oficiales de ARCA (MNI, deducción especial, cargas de familia) y la
            escala del art. 94. El motor prorratea por mes (cálculo acumulado). Se aplica solo a
            los legajos con &ldquo;liquida Ganancias&rdquo; activado.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {!result.ok ? (
            <p className="text-sm text-destructive">{result.error}</p>
          ) : result.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin parámetros cargados.</p>
          ) : (
            result.data.map((p) => (
              <div key={p.id} className="rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">Vigente desde {formatFechaAR(p.vigenciaDesde)}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · MNI {fmt(p.mni)} · Ded. especial {fmt(p.deduccionEspecial)} · Cónyuge{" "}
                      {fmt(p.deduccionConyuge)} · Hijo {fmt(p.deduccionHijo)}
                    </span>
                  </div>
                  <EliminarBtn kind="parametro" id={p.id} />
                </div>

                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Escala art. 94</p>
                  {p.tramos.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Desde</TableHead>
                          <TableHead>Hasta</TableHead>
                          <TableHead>Monto fijo</TableHead>
                          <TableHead>%</TableHead>
                          <TableHead className="w-[1%]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {p.tramos.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>{fmt(t.desde)}</TableCell>
                            <TableCell>{t.hasta ? fmt(t.hasta) : "sin tope"}</TableCell>
                            <TableCell>{fmt(t.montoFijo)}</TableCell>
                            <TableCell>{(Number(t.porcentaje) * 100).toFixed(2)}%</TableCell>
                            <TableCell>
                              <EliminarBtn kind="tramo" id={t.id} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <div className="mt-2">
                    <TramoForm parametroId={p.id} />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nuevo período de parámetros</CardTitle>
        </CardHeader>
        <CardContent>
          <ParametroForm />
        </CardContent>
      </Card>
    </div>
  );
}
