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
  tipo?: "LCT_ESTANDAR" | "FONDO_CESE_UOCRA";
  fondoCeseLaboral?: { saldoActual: string };
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
  liquidacionFinal?: {
    diasTrabajadosMes: { dias: number; monto: string };
    sacProporcional: string;
    vacacionesNoGozadas: { dias: number; monto: string };
    integracionMesDespido: string;
    sacSobreIntegracion: string;
    sacSobrePreaviso: string;
    subtotalFinal: string;
    warnings?: string[];
  };
  totalGeneral?: string;
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
  const yaCalculado = !!resultado?.art245 || resultado?.tipo === "FONDO_CESE_UOCRA";
  const esFondoCese = resultado?.tipo === "FONDO_CESE_UOCRA";

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
          {yaCalculado && !esFondoCese && (
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
          {resultado.fondoCeseLaboral && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fondo de Cese Laboral (Ley 22.250)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  UOCRA: este monto es el saldo acumulado de la cuenta individual del trabajador
                  (depósitos mensuales del empleador), no una indemnización art. 245 — no aplica
                  tope ni piso de garantía.
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Saldo a retirar</p>
                <p className="text-2xl font-semibold">{fmt(resultado.fondoCeseLaboral.saldoActual)}</p>
              </CardContent>
            </Card>
          )}

          {resultado.art245 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Indemnización por antigüedad (art. 245)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Base art. 245</p>
                  <p>{fmt(resultado.art245.baseArt245)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Antigüedad</p>
                  <p>{resultado.art245.antiguedadAnios} año(s)</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monto sin tope</p>
                  <p>{fmt(resultado.art245.indemnizacionSinTope)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tope convenio (3x)</p>
                  <p>{fmt(resultado.art245.topeConvenio)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Con tope aplicado</p>
                  <p>{fmt(resultado.art245.indemnizacionConTope)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Piso garantía 67%</p>
                  <p>{fmt(resultado.art245.pisoGarantia67)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Piso 1 mes</p>
                  <p>{fmt(resultado.art245.pisoUnMes)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Indemnización final</p>
                  <p className="font-semibold">{fmt(resultado.art245.indemnizacionFinal)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {resultado.liquidacionFinal && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Liquidación final (rubros)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>
                    Días trabajados del mes ({resultado.liquidacionFinal.diasTrabajadosMes.dias})
                  </span>
                  <span>{fmt(resultado.liquidacionFinal.diasTrabajadosMes.monto)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SAC proporcional</span>
                  <span>{fmt(resultado.liquidacionFinal.sacProporcional)}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    Vacaciones no gozadas ({resultado.liquidacionFinal.vacacionesNoGozadas.dias}{" "}
                    día/s)
                  </span>
                  <span>{fmt(resultado.liquidacionFinal.vacacionesNoGozadas.monto)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Integración mes de despido (art. 233)</span>
                  <span>{fmt(resultado.liquidacionFinal.integracionMesDespido)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SAC sobre integración</span>
                  <span>{fmt(resultado.liquidacionFinal.sacSobreIntegracion)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SAC sobre preaviso</span>
                  <span>{fmt(resultado.liquidacionFinal.sacSobrePreaviso)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span>Subtotal liquidación final</span>
                  <span>{fmt(resultado.liquidacionFinal.subtotalFinal)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {resultado.preaviso && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preaviso (art. 231)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Meses de preaviso</p>
                  <p>{resultado.preaviso.mesesPreaviso}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monto</p>
                  <p>{fmt(resultado.preaviso.montoPreaviso)}</p>
                </div>
              </CardContent>
            </Card>
          )}

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
            <CardContent className="space-y-2 pt-6">
              {resultado.liquidacionFinal && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{esFondoCese ? "Fondo de Cese Laboral" : "Indemnización"}</span>
                  <span>{fmt(evento.montoTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold">
                <span>{resultado.totalGeneral ? "Total general" : "Monto total"}</span>
                <span>{fmt(resultado.totalGeneral ?? evento.montoTotal)}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
