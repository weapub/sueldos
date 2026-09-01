import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireEmpresaAccess } from "@/lib/authz";
import { listarCatalogoConceptos } from "@/actions/liquidaciones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ConceptosManualesPanel,
  type ConceptoManualFila,
} from "./conceptos-manuales-panel";
import { HorasExtraPanel, type HoraExtraFila } from "./horas-extra-panel";
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

function pct(n: unknown): string | null {
  if (n == null) return null;
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return null;
  return `${(v * 100).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;
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

  const editable = liquidacion.periodo.estado === "BORRADOR";
  const catalogoResult = editable
    ? await listarCatalogoConceptos(liquidacion.legajo.empresaId)
    : null;
  const catalogo = catalogoResult?.ok
    ? catalogoResult.data.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        requiereConsentimiento: c.requiereConsentimiento,
      }))
    : [];
  const conceptosManuales: ConceptoManualFila[] = (
    (liquidacion.snapshotInputJson as {
      conceptosManuales?: {
        conceptoDefinicionId: string;
        monto: string;
        consentimientoFirmado?: boolean;
        porcentaje?: string;
        baseCalculo?: "REMUNERATIVO" | "NO_REMUNERATIVO" | "HABERES" | "BASICO";
      }[];
    })?.conceptosManuales ?? []
  ).map((c, i) => ({
    indice: i,
    conceptoDefinicionId: c.conceptoDefinicionId,
    nombre: catalogo.find((d) => d.id === c.conceptoDefinicionId)?.nombre ?? "(concepto eliminado)",
    monto: String(c.monto),
    consentimientoFirmado: c.consentimientoFirmado ?? false,
    porcentaje: c.porcentaje,
    baseCalculo: c.baseCalculo,
  }));

  const horasExtraFilas: HoraExtraFila[] = (
    (liquidacion.snapshotInputJson as {
      horasExtra?: { horas: string; recargo: 50 | 100; modalidad: HoraExtraFila["modalidad"] }[];
    })?.horasExtra ?? []
  ).map((h, i) => ({
    indice: i,
    horas: String(h.horas),
    recargo: h.recargo,
    modalidad: h.modalidad,
  }));

  const totalRem = Number(liquidacion.totalRemunerativo);
  const totalNoRem = Number(liquidacion.totalNoRemunerativo);
  const basesCalculo = {
    remunerativo: totalRem,
    noRemunerativo: totalNoRem,
    haberes: totalRem + totalNoRem,
    basico: Number(liquidacion.legajo.sueldoBasico),
  };

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
                    <TableCell>
                      {c.descripcion}
                      {pct(c.porcentaje) && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {pct(c.porcentaje)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{fmt(c.monto)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {editable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conceptos manuales</CardTitle>
            <p className="text-sm text-muted-foreground">
              Agregá, editá o quitá conceptos cargados a mano. Al guardar se recalcula la
              liquidación.
            </p>
          </CardHeader>
          <CardContent>
            <ConceptosManualesPanel
              liquidacionId={liquidacion.id}
              conceptos={conceptosManuales}
              catalogo={catalogo}
              bases={basesCalculo}
            />
          </CardContent>
        </Card>
      )}

      {editable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horas extra</CardTitle>
            <p className="text-sm text-muted-foreground">
              Valor hora = (básico + antigüedad + presentismo) / divisor de convenio. Al guardar
              se recalcula la liquidación.
            </p>
          </CardHeader>
          <CardContent>
            <HorasExtraPanel liquidacionId={liquidacion.id} horasExtra={horasExtraFilas} />
          </CardContent>
        </Card>
      )}

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
