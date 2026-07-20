import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmpresaAccess, AuthzError } from "@/lib/authz";
import { generarIndemnizacionPdf } from "@/lib/pdf/indemnizacion";
import { MOTIVO_LABEL } from "@/lib/validation/desvinculaciones";
import { formatFechaAR } from "@/lib/fecha";

interface ResultadoJson {
  art245: {
    baseArt245: string;
    antiguedadAnios: number;
    indemnizacionSinTope: string;
    topeConvenio: string;
    indemnizacionConTope: string;
    pisoGarantia67: string;
    pisoUnMes: string;
    indemnizacionFinal: string;
  };
  preaviso: { mesesPreaviso: number; montoPreaviso: string };
  warnings: string[];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventoId: string }> },
) {
  const { eventoId } = await params;

  const evento = await db.eventoDesvinculacion.findUnique({
    where: { id: eventoId },
    include: { legajo: { include: { empresa: true } }, beneficiarios: true },
  });
  if (!evento) {
    return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  }

  try {
    await requireEmpresaAccess(evento.empresaId);
  } catch (err) {
    if (err instanceof AuthzError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  const resultado = evento.resultadoJson as unknown as ResultadoJson;
  if (!resultado?.art245) {
    return NextResponse.json({ error: "La indemnización todavía no fue calculada." }, { status: 400 });
  }

  const pdfBuffer = await generarIndemnizacionPdf({
    empresa: { razonSocial: evento.legajo.empresa.razonSocial, cuit: evento.legajo.empresa.cuit },
    legajo: {
      nombre: evento.legajo.nombre,
      apellido: evento.legajo.apellido,
      cuil: evento.legajo.cuil,
      fechaIngreso: formatFechaAR(evento.legajo.fechaIngreso),
    },
    motivo: MOTIVO_LABEL[evento.motivo],
    fechaEgreso: formatFechaAR(evento.fechaEgreso),
    art245: resultado.art245,
    preaviso: resultado.preaviso,
    beneficiarios: evento.beneficiarios.map((b) => ({
      nombre: b.nombre,
      vinculo: b.vinculo,
      montoAsignado: b.montoAsignado.toString(),
    })),
    warnings: resultado.warnings ?? [],
    montoTotal: evento.montoTotal.toString(),
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="indemnizacion-${evento.legajo.apellido}.pdf"`,
    },
  });
}
