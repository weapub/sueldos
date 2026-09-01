import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmpresaAccess, AuthzError } from "@/lib/authz";
import { generarCertificadoArt80Pdf } from "@/lib/pdf/certificadoArt80";
import { antiguedadEnAnios } from "@/lib/payroll/vacaciones";
import { formatFechaAR } from "@/lib/fecha";

const MESES = [
  "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ legajoId: string }> },
) {
  const { legajoId } = await params;

  const legajo = await db.legajo.findUnique({
    where: { id: legajoId },
    include: {
      empresa: true,
      categoria: true,
      liquidaciones: {
        where: { estado: { not: "ANULADA" } },
        include: { periodo: true, conceptos: { include: { conceptoDefinicion: true } } },
        orderBy: [{ periodo: { anio: "desc" } }, { periodo: { mes: "desc" } }],
        take: 12,
      },
    },
  });
  if (!legajo) return NextResponse.json({ error: "Legajo no encontrado." }, { status: 404 });

  try {
    await requireEmpresaAccess(legajo.empresaId);
  } catch (err) {
    if (err instanceof AuthzError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const hasta = legajo.fechaEgreso ?? new Date();
  const anios = antiguedadEnAnios(legajo.fechaIngreso, hasta);
  const meses =
    (hasta.getUTCFullYear() - legajo.fechaIngreso.getUTCFullYear()) * 12 +
    (hasta.getUTCMonth() - legajo.fechaIngreso.getUTCMonth()) -
    anios * 12;

  const pdf = await generarCertificadoArt80Pdf({
    empresa: {
      razonSocial: legajo.empresa.razonSocial,
      cuit: legajo.empresa.cuit,
      direccion: legajo.empresa.direccion,
    },
    legajo: {
      nombre: legajo.nombre,
      apellido: legajo.apellido,
      cuil: legajo.cuil,
      categoria: legajo.categoria.nombre,
      fechaIngreso: formatFechaAR(legajo.fechaIngreso),
      fechaEgreso: legajo.fechaEgreso ? formatFechaAR(legajo.fechaEgreso) : null,
      antiguedad: `${anios} año/s ${Math.max(meses, 0)} mes/es`,
    },
    remuneraciones: legajo.liquidaciones.map((l) => ({
      periodo: `${MESES[l.periodo.mes]} ${l.periodo.anio}`,
      remunerativo: l.totalRemunerativo.toString(),
      noRemunerativo: l.totalNoRemunerativo.toString(),
      aportes: l.conceptos
        .filter((c) => c.conceptoDefinicion.tipo === "DEDUCCION")
        .reduce((acc, c) => acc + Number(c.monto), 0)
        .toFixed(2),
    })),
    emitidoEn: formatFechaAR(new Date()),
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificado-art80-${legajo.apellido}.pdf"`,
    },
  });
}
