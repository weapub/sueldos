import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmpresaAccess, AuthzError } from "@/lib/authz";
import { money } from "@/lib/payroll/money";
import {
  formatLsdFile,
  type Registro02Input,
  type Registro03Input,
  type Registro04Input,
} from "@/lib/payroll/lsd";

function diasEnMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ periodoId: string }> },
) {
  const { periodoId } = await params;

  const periodo = await db.periodoLiquidacion.findUnique({
    where: { id: periodoId },
    include: {
      empresa: true,
      liquidaciones: {
        include: { legajo: true, conceptos: { include: { conceptoDefinicion: true }, orderBy: { orden: "asc" } } },
      },
    },
  });
  if (!periodo) {
    return NextResponse.json({ error: "Período no encontrado." }, { status: 404 });
  }

  try {
    await requireEmpresaAccess(periodo.empresaId);
  } catch (err) {
    if (err instanceof AuthzError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  const fechaPago = periodo.fechaPago ?? new Date(Date.UTC(periodo.anio, periodo.mes - 1, diasEnMes(periodo.anio, periodo.mes)));

  const registros02: Registro02Input[] = periodo.liquidaciones.map((liq) => ({
    cuil: liq.legajo.cuil,
    legajo: String(liq.legajo.numeroLegajo),
    fechaPago,
    formaPago: 3, // acreditación bancaria — art. 124 Ley 27.802 exige pago en cuenta sueldo
  }));

  const registros03: Registro03Input[] = periodo.liquidaciones.flatMap((liq) =>
    liq.conceptos
      .filter((c) => c.conceptoDefinicion.tipo !== "CONTRIBUCION_PATRONAL")
      .map((c) => ({
        cuil: liq.legajo.cuil,
        codigoConcepto: c.conceptoDefinicion.codigo,
        cantidad: c.cantidad ? money(c.cantidad.toString()) : money(1),
        importe: money(c.monto.toString()),
        debitoCredito: c.conceptoDefinicion.tipo === "DEDUCCION" ? ("D" as const) : ("C" as const),
      })),
  );

  // Bases imponibles 1-10: el motor todavía no calcula las 11 remuneraciones imponibles del
  // F931 por separado (queda pendiente para una fase posterior) — se usa el total remunerativo
  // como aproximación para todas. Validar contra el cálculo real antes de una presentación real.
  const registros04: Registro04Input[] = periodo.liquidaciones.map((liq) => {
    const remuneracionBruta = money(liq.totalRemunerativo.toString()).plus(liq.totalNoRemunerativo.toString());
    const baseAproximada = money(liq.totalRemunerativo.toString());
    return {
      cuil: liq.legajo.cuil,
      conyuge: liq.legajo.conyuge,
      cantidadHijos: liq.legajo.cantidadHijos,
      marcaCCT: liq.legajo.correspondeCCT,
      marcaSCVO: liq.legajo.correspondeSVO,
      marcaCorrespondeReduccion: liq.legajo.correspondeReduccion,
      tipoEmpresa: periodo.empresa.tipoEmpresaArca ?? 1,
      codigoSituacion: liq.legajo.codigoSituacion ?? 0,
      codigoCondicion: liq.legajo.codigoCondicion ?? 0,
      codigoActividad: liq.legajo.codigoActividad ?? 0,
      codigoModalidadContratacion: liq.legajo.codigoModalidadContratacion ?? 0,
      codigoSiniestrado: liq.legajo.codigoSiniestrado ?? 0,
      codigoLocalidad: liq.legajo.codigoLocalidad ?? 0,
      situacionRevista1: liq.legajo.situacionRevista1 ?? undefined,
      diaInicioRevista1: liq.legajo.diaInicioSituacionRevista1 ?? undefined,
      situacionRevista2: liq.legajo.situacionRevista2 ?? undefined,
      diaInicioRevista2: liq.legajo.diaInicioSituacionRevista2 ?? undefined,
      situacionRevista3: liq.legajo.situacionRevista3 ?? undefined,
      diaInicioRevista3: liq.legajo.diaInicioSituacionRevista3 ?? undefined,
      cantDiasTrabajados: liq.diasTrabajados,
      horasTrabajadas: 0,
      codigoObraSocial: liq.legajo.codigoObraSocialRnos ?? "",
      remuneracionBruta,
      basesImponibles: [baseAproximada, baseAproximada, baseAproximada, baseAproximada, baseAproximada, money(0), money(0), baseAproximada, baseAproximada],
      baseImponible10: baseAproximada,
      importeADetraer: money(0),
    };
  });

  const contenido = formatLsdFile({
    registro01: {
      cuitEmpleador: periodo.empresa.cuit,
      identificacionEnvio: periodo.id.slice(0, 15),
      anio: periodo.anio,
      mes: periodo.mes,
      tipoLiquidacion: "M",
      numeroLiquidacion: "1",
      diasBase: diasEnMes(periodo.anio, periodo.mes),
      cantidadRegistros04: registros04.length,
    },
    registros02,
    registros03,
    registros04,
  });

  return new NextResponse(contenido, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="lsd-${periodo.empresa.cuit}-${periodo.anio}${String(periodo.mes).padStart(2, "0")}.txt"`,
    },
  });
}
