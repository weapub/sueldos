"use server";

import { db } from "@/lib/db";
import { requireEmpresaAccess, requireEscritura, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { eventoDesvinculacionSchema } from "@/lib/validation/desvinculaciones";
import { money } from "@/lib/payroll/money";
import { calcularIndemnizacion, type Beneficiario, type VinculoBeneficiario } from "@/lib/payroll/indemnizacion";
import { evaluarCoberturaFal } from "@/lib/payroll/fal";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/empresas";
import type { Prisma } from "@/generated/prisma/client";

export async function listarDesvinculaciones(empresaId: string) {
  try {
    await requireEmpresaAccess(empresaId);
    const eventos = await db.eventoDesvinculacion.findMany({
      where: { empresaId },
      include: { legajo: true },
      orderBy: { createdAt: "desc" },
    });
    return { ok: true as const, data: eventos };
  } catch (err) {
    return { ok: false as const, error: err instanceof AuthzError ? err.message : "Error al listar desvinculaciones." };
  }
}

export async function obtenerDesvinculacion(eventoId: string) {
  try {
    const evento = await db.eventoDesvinculacion.findUnique({
      where: { id: eventoId },
      include: { legajo: { include: { categoria: true, empresa: true } }, beneficiarios: true },
    });
    if (!evento) return { ok: false as const, error: "Evento no encontrado." };
    await requireEmpresaAccess(evento.empresaId);
    return { ok: true as const, data: evento };
  } catch (err) {
    return { ok: false as const, error: err instanceof AuthzError ? err.message : "Error al obtener el evento." };
  }
}

export async function crearEventoDesvinculacion(
  empresaId: string,
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireEscritura(empresaId);
    const parsed = eventoDesvinculacionSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const v = parsed.data;

    const evento = await db.eventoDesvinculacion.create({
      data: {
        empresaId,
        legajoId: v.legajoId,
        fechaEgreso: new Date(v.fechaEgreso),
        motivo: v.motivo,
        preavisoOtorgado: v.preavisoOtorgado,
        resultadoJson: {},
        montoTotal: 0,
        calculadoPorUsuarioId: session.user.id,
      },
    });

    await logAudit({
      usuarioId: session.user.id,
      accion: "DESVINCULACION_CREADA",
      entidad: "EventoDesvinculacion",
      entidadId: evento.id,
      detalle: { legajoId: v.legajoId, motivo: v.motivo },
    });

    revalidatePath(`/empresas/${empresaId}/desvinculaciones`);
    return { ok: true, data: { id: evento.id } };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al crear la desvinculación." };
  }
}

export async function agregarBeneficiario(
  eventoId: string,
  nombre: string,
  vinculo: VinculoBeneficiario,
): Promise<ActionResult> {
  try {
    const evento = await db.eventoDesvinculacion.findUniqueOrThrow({ where: { id: eventoId } });
    await requireEscritura(evento.empresaId);
    if (evento.estado !== "BORRADOR") {
      return { ok: false, error: "El evento ya fue confirmado." };
    }
    if (!nombre.trim()) {
      return { ok: false, error: "Ingresá el nombre del beneficiario." };
    }
    await db.beneficiarioFallecimiento.create({
      data: { eventoDesvinculacionId: eventoId, nombre: nombre.trim(), vinculo, montoAsignado: 0 },
    });
    revalidatePath(`/empresas/${evento.empresaId}/desvinculaciones/${eventoId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al agregar el beneficiario." };
  }
}

/**
 * Antigüedad en meses, usada para decidir si el legajo está en período de prueba.
 * Getters UTC: ver nota en lib/payroll/indemnizacion.ts sobre fechas-calendario.
 */
function mesesDeAntiguedad(fechaIngreso: Date, fechaEgreso: Date): number {
  return (
    (fechaEgreso.getUTCFullYear() - fechaIngreso.getUTCFullYear()) * 12 +
    (fechaEgreso.getUTCMonth() - fechaIngreso.getUTCMonth())
  );
}

export async function calcularYGuardarIndemnizacion(
  eventoId: string,
): Promise<ActionResult<{ montoTotal: string; warnings: string[] }>> {
  try {
    const evento = await db.eventoDesvinculacion.findUniqueOrThrow({
      where: { id: eventoId },
      include: { legajo: { include: { categoria: true } }, beneficiarios: true },
    });
    const session = await requireEscritura(evento.empresaId);
    if (evento.estado !== "BORRADOR") {
      return { ok: false, error: "El evento ya fue confirmado, no se puede recalcular." };
    }

    const legajo = evento.legajo;

    // Conceptos variables/habituales de los últimos 12 meses (para el promedio del art. 245).
    const historico = await db.liquidacionMensual.findMany({
      where: { legajoId: legajo.id, estado: { not: "ANULADA" } },
      orderBy: [{ periodo: { anio: "asc" } }, { periodo: { mes: "asc" } }],
      take: 12,
      include: { conceptos: { include: { conceptoDefinicion: true } } },
    });
    const remuneracionesVariables = historico.map((h) =>
      h.conceptos
        .filter((c) => c.conceptoDefinicion.esVariable)
        .reduce((acc, c) => acc.plus(c.monto.toString()), money(0)),
    );

    const enPeriodoDePrueba =
      legajo.tipoContrato === "TIEMPO_INDETERMINADO" &&
      mesesDeAntiguedad(legajo.fechaIngreso, evento.fechaEgreso) < 3;

    const beneficiarios: Beneficiario[] = evento.beneficiarios.map((b) => ({
      nombre: b.nombre,
      vinculo: b.vinculo,
    }));

    const resultado = calcularIndemnizacion({
      motivo: evento.motivo,
      fechaIngreso: legajo.fechaIngreso,
      fechaEgreso: evento.fechaEgreso,
      enPeriodoDePrueba,
      preavisoOtorgado: evento.preavisoOtorgado,
      base: {
        remuneracionFijaHabitual: money(legajo.sueldoBasico.toString()),
        remuneracionesVariablesUltimos12Meses: remuneracionesVariables,
      },
      salarioBaseConvenio: money(legajo.categoria.salarioBaseConvenio.toString()),
      fallecimiento: evento.motivo === "FALLECIMIENTO" ? { beneficiarios } : undefined,
    });

    const resultadoJson: Prisma.InputJsonValue = {
      art245: {
        baseArt245: resultado.art245.baseArt245.toString(),
        antiguedadAnios: resultado.art245.antiguedadAnios,
        indemnizacionSinTope: resultado.art245.indemnizacionSinTope.toString(),
        topeConvenio: resultado.art245.topeConvenio.toString(),
        indemnizacionConTope: resultado.art245.indemnizacionConTope.toString(),
        pisoGarantia67: resultado.art245.pisoGarantia67.toString(),
        pisoUnMes: resultado.art245.pisoUnMes.toString(),
        indemnizacionFinal: resultado.art245.indemnizacionFinal.toString(),
      },
      preaviso: {
        mesesPreaviso: resultado.preaviso.mesesPreaviso,
        montoPreaviso: resultado.preaviso.montoPreaviso.toString(),
      },
      montoIndemnizacionAntiguedad: resultado.montoIndemnizacionAntiguedad.toString(),
      warnings: resultado.warnings,
      enPeriodoDePrueba,
    };

    await db.$transaction(async (tx) => {
      await tx.eventoDesvinculacion.update({
        where: { id: eventoId },
        data: {
          resultadoJson,
          montoTotal: resultado.montoTotal.toString(),
          calculadoPorUsuarioId: session.user.id,
        },
      });

      await tx.beneficiarioFallecimiento.deleteMany({ where: { eventoDesvinculacionId: eventoId } });
      if (resultado.beneficiariosFallecimiento) {
        for (const b of resultado.beneficiariosFallecimiento) {
          await tx.beneficiarioFallecimiento.create({
            data: {
              eventoDesvinculacionId: eventoId,
              nombre: b.nombre,
              vinculo: b.vinculo,
              montoAsignado: b.montoAsignado.toString(),
            },
          });
        }
      }
    });

    await logAudit({
      usuarioId: session.user.id,
      accion: "INDEMNIZACION_CALCULADA",
      entidad: "EventoDesvinculacion",
      entidadId: eventoId,
      detalle: { montoTotal: resultado.montoTotal.toString() },
    });

    revalidatePath(`/empresas/${evento.empresaId}/desvinculaciones/${eventoId}`);
    return { ok: true, data: { montoTotal: resultado.montoTotal.toString(), warnings: resultado.warnings } };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al calcular la indemnización." };
  }
}

export async function confirmarDesvinculacion(eventoId: string): Promise<ActionResult> {
  try {
    const evento = await db.eventoDesvinculacion.findUniqueOrThrow({
      where: { id: eventoId },
      include: { legajo: true },
    });
    const session = await requireEscritura(evento.empresaId);

    await db.$transaction(async (tx) => {
      await tx.eventoDesvinculacion.update({ where: { id: eventoId }, data: { estado: "CONFIRMADO" } });
      await tx.legajo.update({
        where: { id: evento.legajoId },
        data: { situacion: "DESVINCULADO", fechaEgreso: evento.fechaEgreso },
      });

      // Evalúa cobertura del Fondo de Asistencia Laboral (Título II) para esta indemnización.
      // El empleador sigue siendo responsable por cualquier monto que el fondo no cubra.
      const falCuenta = await tx.falCuenta.findUnique({ where: { empresaId: evento.empresaId } });
      if (falCuenta && Number(evento.montoTotal) > 0) {
        const cobertura = evaluarCoberturaFal({
          fal: { fechaAlta: falCuenta.fechaAlta, saldoActual: money(falCuenta.saldoActual.toString()) },
          legajo: { fechaIngreso: evento.legajo.fechaIngreso },
          fechaEgreso: evento.fechaEgreso,
          montoSolicitado: money(evento.montoTotal.toString()),
        });

        if (cobertura.montoCubiertoPorFondo.gt(0)) {
          const nuevoSaldo = money(falCuenta.saldoActual.toString()).minus(cobertura.montoCubiertoPorFondo);
          await tx.falMovimiento.create({
            data: {
              falCuentaId: falCuenta.id,
              tipo: "RETIRO_INDEMNIZACION",
              eventoDesvinculacionId: eventoId,
              monto: cobertura.montoCubiertoPorFondo.negated().toString(),
              saldoResultante: nuevoSaldo.toString(),
              fecha: evento.fechaEgreso,
              descripcion: `Cobertura indemnización ${evento.legajo.apellido}, ${evento.legajo.nombre}`,
            },
          });
          await tx.falCuenta.update({ where: { id: falCuenta.id }, data: { saldoActual: nuevoSaldo.toString() } });
        }
      }
    });

    await logAudit({
      usuarioId: session.user.id,
      accion: "DESVINCULACION_CONFIRMADA",
      entidad: "EventoDesvinculacion",
      entidadId: eventoId,
    });

    revalidatePath(`/empresas/${evento.empresaId}/desvinculaciones/${eventoId}`);
    revalidatePath(`/empresas/${evento.empresaId}/legajos`);
    revalidatePath(`/empresas/${evento.empresaId}/fal`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al confirmar la desvinculación." };
  }
}
