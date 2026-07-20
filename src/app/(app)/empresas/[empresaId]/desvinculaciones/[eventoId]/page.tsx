import { notFound } from "next/navigation";
import { obtenerDesvinculacion } from "@/actions/desvinculaciones";
import { MOTIVO_LABEL } from "@/lib/validation/desvinculaciones";
import { formatFechaAR } from "@/lib/fecha";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DesvinculacionActions } from "./desvinculacion-actions";
import { BeneficiariosPanel } from "./beneficiarios-panel";

function fmt(n: unknown) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

interface ResultadoJson {
  art245?: {
    baseArt245: string;
    antiguedadAnios: number;
    indemnizacionSinTope: string;
    topeConvenio: string;
    indemnizacionConTope: string;
    pisoGarantia67: string;
    pisoUnMes: string;
    indemnizacionFinal: string;
  };
  preaviso?: { mesesPreaviso: number; montoPreaviso: string };
  montoIndemnizacionAntiguedad?: string;
  warnings?: string[];
  enPeriodoDePrueba?: boolean;
}

export default async function DesvinculacionDetailPage({
  params,
}: {
  params: Promise<{ empresaId: string; eventoId: string }>;
}) {
  const { eventoId } = await params;
  const result = await obtenerDesvinculacion(eventoId);
  if (!result.ok) notFound();
  const evento = result.data;
  const resultado = evento.resultadoJson as ResultadoJson;
  const yaCalculado = !!resultado?.art245;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {evento.legajo.apellido}, {evento.legajo.nombre}
          </h1>
          <p className="text-sm text-muted-foreground">
            {MOTIVO_LABEL[evento.motivo]} — egreso {formatFechaAR(evento.fechaEgreso)}
          </p>
          <Badge variant={evento.estado === "BORRADOR" ? "secondary" : "default"} className="mt-1">
            {evento.estado}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {yaCalculado && (
            <Button asChild variant="secondary">
              <a href={`/api/indemnizacion/${evento.id}/pdf`} target="_blank" rel="noreferrer">
                Descargar PDF
              </a>
            </Button>
          )}
          <DesvinculacionActions eventoId={evento.id} estado={evento.estado} motivo={evento.motivo} />
        </div>
      </div>

      {evento.motivo === "FALLECIMIENTO" && evento.estado === "BORRADOR" && (
        <BeneficiariosPanel
          eventoId={evento.id}
          beneficiariosIniciales={evento.beneficiarios.map((b) => ({
            id: b.id,
            nombre: b.nombre,
            vinculo: b.vinculo,
          }))}
        />
      )}

      {!yaCalculado ? (
        <p className="text-sm text-muted-foreground">
          Todavía no se calculó la indemnización. Usá &quot;Calcular&quot; para generar el desglose.
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Indemnización por antigüedad (art. 245)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Base art. 245</p>
                <p>{fmt(resultado.art245!.baseArt245)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Antigüedad</p>
                <p>{resultado.art245!.antiguedadAnios} año(s)</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monto sin tope</p>
                <p>{fmt(resultado.art245!.indemnizacionSinTope)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tope convenio (3x)</p>
                <p>{fmt(resultado.art245!.topeConvenio)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Con tope aplicado</p>
                <p>{fmt(resultado.art245!.indemnizacionConTope)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Piso garantía 67%</p>
                <p>{fmt(resultado.art245!.pisoGarantia67)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Piso 1 mes</p>
                <p>{fmt(resultado.art245!.pisoUnMes)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Indemnización final</p>
                <p className="font-semibold">{fmt(resultado.art245!.indemnizacionFinal)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preaviso (art. 231)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Meses de preaviso</p>
                <p>{resultado.preaviso?.mesesPreaviso ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monto</p>
                <p>{fmt(resultado.preaviso?.montoPreaviso ?? 0)}</p>
              </div>
            </CardContent>
          </Card>

          {evento.beneficiarios.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribución art. 248 (fallecimiento)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {evento.beneficiarios.map((b) => (
                  <div key={b.id} className="flex justify-between">
                    <span>
                      {b.nombre} ({b.vinculo})
                    </span>
                    <span>{fmt(b.montoAsignado)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {resultado.warnings && resultado.warnings.length > 0 && (
            <Card className="border-amber-400">
              <CardHeader>
                <CardTitle className="text-base">Advertencias</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-amber-700">
                {resultado.warnings.map((w, i) => (
                  <p key={i}>• {w}</p>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between text-lg font-semibold">
                <span>Monto total</span>
                <span>{fmt(evento.montoTotal)}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
