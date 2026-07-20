import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmpresaAccess, AuthzError } from "@/lib/authz";
import { generarReciboPdf } from "@/lib/pdf/recibo";
import { generarReciboLegacyPdf } from "@/lib/pdf/reciboLegacy";
import { antiguedadEnAnios } from "@/lib/payroll/vacaciones";
import { formatFechaAR } from "@/lib/fecha";

/** Decreto 407/2026: el recibo Anexo III rige desde esta fecha; antes se reimprime el formato viejo. */
const ANEXO_III_FECHA_VIGENCIA = new Date("2026-06-01T00:00:00.000Z");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ liquidacionId: string }> },
) {
  const { liquidacionId } = await params;

  const liquidacion = await db.liquidacionMensual.findUnique({
    where: { id: liquidacionId },
    include: {
      legajo: { include: { empresa: true, categoria: true } },
      periodo: true,
      conceptos: { include: { conceptoDefinicion: true }, orderBy: { orden: "asc" } },
    },
  });
  if (!liquidacion) {
    return NextResponse.json({ error: "Liquidación no encontrada." }, { status: 404 });
  }

  try {
    await requireEmpresaAccess(liquidacion.legajo.empresaId);
  } catch (err) {
    if (err instanceof AuthzError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  const fechaPeriodo = new Date(Date.UTC(liquidacion.periodo.anio, liquidacion.periodo.mes - 1, 1));
  const esAnexoIII = fechaPeriodo >= ANEXO_III_FECHA_VIGENCIA;

  const conceptosHaberesYDeducciones = liquidacion.conceptos.filter(
    (c) => c.conceptoDefinicion.tipo !== "CONTRIBUCION_PATRONAL",
  );

  let pdfBuffer: Buffer;
  if (esAnexoIII) {
    const contribucionesPatronales = liquidacion.conceptos
      .filter((c) => c.conceptoDefinicion.tipo === "CONTRIBUCION_PATRONAL")
      .map((c) => ({
        descripcion: c.descripcion,
        monto: c.monto.toString(),
        rubro: c.conceptoDefinicion.rubroRecibo,
      }));

    pdfBuffer = await generarReciboPdf({
      empresa: {
        razonSocial: liquidacion.legajo.empresa.razonSocial,
        cuit: liquidacion.legajo.empresa.cuit,
        direccion: liquidacion.legajo.empresa.direccion,
      },
      legajo: {
        nombre: liquidacion.legajo.nombre,
        apellido: liquidacion.legajo.apellido,
        cuil: liquidacion.legajo.cuil,
        categoria: liquidacion.legajo.categoria.nombre,
        numeroLegajo: liquidacion.legajo.numeroLegajo,
        fechaIngreso: formatFechaAR(liquidacion.legajo.fechaIngreso),
        antiguedadAnios: antiguedadEnAnios(liquidacion.legajo.fechaIngreso, fechaPeriodo),
      },
      periodo: {
        anio: liquidacion.periodo.anio,
        mes: liquidacion.periodo.mes,
        fechaPago: liquidacion.periodo.fechaPago ? formatFechaAR(liquidacion.periodo.fechaPago) : null,
        ultimoDepositoAportesPeriodo: liquidacion.periodo.ultimoDepositoAportesPeriodo,
        ultimoDepositoAportesBanco: liquidacion.periodo.ultimoDepositoAportesBanco,
        ultimoDepositoAportesFecha: liquidacion.periodo.ultimoDepositoAportesFecha
          ? formatFechaAR(liquidacion.periodo.ultimoDepositoAportesFecha)
          : null,
      },
      diasTrabajados: liquidacion.diasTrabajados,
      conceptos: conceptosHaberesYDeducciones.map((c) => ({
        descripcion: c.descripcion,
        monto: c.monto.toString(),
        esDeduccion: c.conceptoDefinicion.tipo === "DEDUCCION",
      })),
      contribucionesPatronales,
      totalRemunerativo: liquidacion.totalRemunerativo.toString(),
      totalNoRemunerativo: liquidacion.totalNoRemunerativo.toString(),
      totalDeducciones: liquidacion.totalDeducciones.toString(),
      totalContribucionesPatronales: liquidacion.totalContribucionesPatronales.toString(),
      neto: liquidacion.neto.toString(),
      constancia:
        liquidacion.reciboHash && liquidacion.reciboEmitidoEn
          ? { hash: liquidacion.reciboHash, emitidoEn: formatFechaAR(liquidacion.reciboEmitidoEn) }
          : null,
    });
  } else {
    pdfBuffer = await generarReciboLegacyPdf({
      empresa: { razonSocial: liquidacion.legajo.empresa.razonSocial, cuit: liquidacion.legajo.empresa.cuit },
      legajo: {
        nombre: liquidacion.legajo.nombre,
        apellido: liquidacion.legajo.apellido,
        cuil: liquidacion.legajo.cuil,
        categoria: liquidacion.legajo.categoria.nombre,
      },
      periodo: { anio: liquidacion.periodo.anio, mes: liquidacion.periodo.mes },
      diasTrabajados: liquidacion.diasTrabajados,
      conceptos: conceptosHaberesYDeducciones.map((c) => ({
        descripcion: c.descripcion,
        monto: c.monto.toString(),
        esDeduccion: c.conceptoDefinicion.tipo === "DEDUCCION",
      })),
      totalRemunerativo: liquidacion.totalRemunerativo.toString(),
      totalNoRemunerativo: liquidacion.totalNoRemunerativo.toString(),
      totalDeducciones: liquidacion.totalDeducciones.toString(),
      totalContribucionesPatronales: liquidacion.totalContribucionesPatronales.toString(),
      neto: liquidacion.neto.toString(),
    });
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${liquidacion.legajo.apellido}-${liquidacion.periodo.anio}-${liquidacion.periodo.mes}.pdf"`,
    },
  });
}
