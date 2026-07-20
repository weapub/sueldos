import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmpresaAccess, AuthzError } from "@/lib/authz";
import { formatSicossFile, type SicossRecordInput } from "@/lib/payroll/sicoss";
import { money } from "@/lib/payroll/money";

const CODIGO_MODALIDAD: Record<string, string> = {
  TIEMPO_INDETERMINADO: "01",
  PLAZO_FIJO: "02",
  TEMPORADA: "03",
  PART_TIME: "04",
  EVENTUAL: "05",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ periodoId: string }> },
) {
  const { periodoId } = await params;

  const periodo = await db.periodoLiquidacion.findUnique({
    where: { id: periodoId },
    include: {
      empresa: true,
      liquidaciones: { include: { legajo: true } },
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

  const registros: SicossRecordInput[] = periodo.liquidaciones.map((liq) => ({
    cuil: liq.legajo.cuil,
    apellidoNombre: `${liq.legajo.apellido}, ${liq.legajo.nombre}`,
    cuitEmpleador: periodo.empresa.cuit,
    anio: periodo.anio,
    mes: periodo.mes,
    codigoModalidad: CODIGO_MODALIDAD[liq.legajo.tipoContrato] ?? "01",
    obraSocial: liq.legajo.obraSocial ?? "",
    remuneracionTotal: money(liq.totalRemunerativo.toString()).plus(liq.totalNoRemunerativo.toString()),
    remuneracionImponible1: money(liq.totalRemunerativo.toString()),
    diasTrabajados: liq.diasTrabajados,
  }));

  const contenido = formatSicossFile(registros);

  return new NextResponse(contenido, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="sicoss-${periodo.empresa.cuit}-${periodo.anio}${String(periodo.mes).padStart(2, "0")}.txt"`,
    },
  });
}
