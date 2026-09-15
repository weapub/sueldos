"use server";

import { db } from "@/lib/db";
import { requireEmpresaAccess, requireEscritura, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { eventoDesvinculacionSchema } from "@/lib/validation/desvinculaciones";
import { money } from "@/lib/payroll/money";
import { calcularIndemnizacion, type Beneficiario, type VinculoBeneficiario } from "@/lib/payroll/indemnizacion";
import { calcularLiquidacionFinal } from "@/lib/payroll/liquidacionFinal";
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
      include: { conceptos: { include: { conceptoDefinicion: true } }, periodo: true },
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

    const esUocra = legajo.categoria.convenio === "UOCRA_22_250";
    const warnings: string[] = [];

    // UOCRA (Ley 22.250) reemplaza preaviso e indemnización art. 245 por completo con el Fondo
    // de Cese Laboral (cuenta individual del trabajador, devengada mes a mes al confirmar cada
    // período — ver `confirmarPeriodo`). No corre `calcularIndemnizacion` para estos legajos:
    // ese cálculo es del régimen LCT estándar, que no aplica acá.
    const resultado = esUocra
      ? null
      : calcularIndemnizacion({
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
    if (resultado) warnings.push(...resultado.warnings);

    let saldoFondoCese = money(0);
    if (esUocra) {
      const fondoCuenta = await db.fondoCeseCuenta.findUnique({ where: { legajoId: legajo.id } });
      saldoFondoCese = fondoCuenta ? money(fondoCuenta.saldoActual.toString()) : money(0);
      warnings.push(
        "UOCRA (Ley 22.250): la indemnización de este legajo es el saldo del Fondo de Cese " +
          "Laboral (depósitos mensuales del empleador en su cuenta individual), no el régimen " +
          "LCT estándar. Se retira automáticamente al confirmar la desvinculación.",
      );
      if (saldoFondoCese.lte(0)) {
        warnings.push(
          "El Fondo de Cese Laboral de este legajo todavía no tiene saldo — revisá que los " +
            "períodos mensuales estén confirmados.",
        );
      }
    }

    // --- Liquidación final (rubros además de la indemnización) ---
    const egresoAnio = evento.fechaEgreso.getUTCFullYear();
    const egresoMes = evento.fechaEgreso.getUTCMonth() + 1;
    const mesesSemestre = egresoMes <= 6 ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12];
    const ultimaLiq = historico.at(-1);
    const remuneracionMensual = ultimaLiq
      ? money(ultimaLiq.totalRemunerativo.toString())
      : money(legajo.sueldoBasico.toString());
    const mejorRemSemestre = historico
      .filter((h) => mesesSemestre.includes(h.periodo?.mes ?? 0))
      .reduce((mx, h) => {
        const v = money(h.totalRemunerativo.toString());
        return v.gt(mx) ? v : mx;
      }, remuneracionMensual);
    const vacPeriodo = await db.vacacionPeriodo.findUnique({
      where: { legajoId_anio: { legajoId: legajo.id, anio: egresoAnio } },
    });
    const liqFinal = calcularLiquidacionFinal({
      fechaIngreso: legajo.fechaIngreso,
      fechaEgreso: evento.fechaEgreso,
      motivo: evento.motivo,
      preavisoOtorgado: evento.preavisoOtorgado,
      remuneracionMensual,
      mejorRemuneracionSemestre: mejorRemSemestre,
      diasVacacionesGozadas: vacPeriodo?.diasGozados ?? 0,
      montoPreaviso: resultado ? resultado.preaviso.montoPreaviso : undefined,
    });
    const montoTotal = esUocra ? saldoFondoCese : resultado!.montoTotal;
    const totalGeneral = montoTotal.plus(liqFinal.subtotalFinal);

    const resultadoJson: Prisma.InputJsonValue = {
      tipo: esUocra ? "FONDO_CESE_UOCRA" : "LCT_ESTANDAR",
      liquidacionFinal: {
        diasTrabajadosMes: {
          dias: liqFinal.diasTrabajadosMes.dias,
          monto: liqFinal.diasTrabajadosMes.monto.toString(),
        },
        sacProporcional: liqFinal.sacProporcional.toString(),
        vacacionesNoGozadas: {
          dias: liqFinal.vacacionesNoGozadas.dias,
          monto: liqFinal.vacacionesNoGozadas.monto.toString(),
        },
        integracionMesDespido: liqFinal.integracionMesDespido.toString(),
        sacSobreIntegracion: liqFinal.sacSobreIntegracion.toString(),
        sacSobrePreaviso: liqFinal.sacSobrePreaviso.toString(),
        subtotalFinal: liqFinal.subtotalFinal.toString(),
        warnings: liqFinal.warnings,
      },
      totalGeneral: totalGeneral.toString(),
      ...(esUocra
        ? { fondoCeseLaboral: { saldoActual: saldoFondoCese.toString() } }
        : {
            art245: {
              baseArt245: resultado!.art245.baseArt245.toString(),
              antiguedadAnios: resultado!.art245.antiguedadAnios,
              indemnizacionSinTope: resultado!.art245.indemnizacionSinTope.toString(),
              topeConvenio: resultado!.art245.topeConvenio.toString(),
              indemnizacionConTope: resultado!.art245.indemnizacionConTope.toString(),
              pisoGarantia67: resultado!.art245.pisoGarantia67.toString(),
              pisoUnMes: resultado!.art245.pisoUnMes.toString(),
              indemnizacionFinal: resultado!.art245.indemnizacionFinal.toString(),
            },
            preaviso: {
              mesesPreaviso: resultado!.preaviso.mesesPreaviso,
              montoPreaviso: resultado!.preaviso.montoPreaviso.toString(),
            },
            montoIndemnizacionAntiguedad: resultado!.montoIndemnizacionAntiguedad.toString(),
          }),
      warnings,
      enPeriodoDePrueba,
    };

    await db.$transaction(async (tx) => {
      await tx.eventoDesvinculacion.update({
        where: { id: eventoId },
        data: {
          resultadoJson,
          montoTotal: montoTotal.toString(),
          calculadoPorUsuarioId: session.user.id,
        },
      });

      await tx.beneficiarioFallecimiento.deleteMany({ where: { eventoDesvinculacionId: eventoId } });
      if (resultado?.beneficiariosFallecimiento) {
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
      detalle: { montoTotal: montoTotal.toString() },
    });

    revalidatePath(`/empresas/${evento.empresaId}/desvinculaciones/${eventoId}`);
    return { ok: true, data: { montoTotal: montoTotal.toString(), warnings } };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al calcular la indemnización." };
  }
}

export async function confirmarDesvinculacion(eventoId: string): Promise<ActionResult> {
  try {
    const evento = await db.eventoDesvinculacion.findUniqueOrThrow({
      where: { id: eventoId },
      include: { legajo: { include: { categoria: true } } },
    });
    const session = await requireEscritura(evento.empresaId);
    const esUocra = evento.legajo.categoria.convenio === "UOCRA_22_250";

    await db.$transaction(async (tx) => {
      await tx.eventoDesvinculacion.update({ where: { id: eventoId }, data: { estado: "CONFIRMADO" } });
      await tx.legajo.update({
        where: { id: evento.legajoId },
        data: { situacion: "DESVINCULADO", fechaEgreso: evento.fechaEgreso },
      });

      if (esUocra) {
        // UOCRA: el "monto total" del evento ES el saldo del Fondo de Cese Laboral (no una
        // indemnización LCT que el FAL pueda cubrir parcialmente — el FAL Título II mutualiza
        // exposición art. 245, que este convenio nunca tiene). Se retira la cuenta completa.
        const fondoCuenta = await tx.fondoCeseCuenta.findUnique({ where: { legajoId: evento.legajoId } });
        if (fondoCuenta && money(fondoCuenta.saldoActual.toString()).gt(0)) {
          const saldo = money(fondoCuenta.saldoActual.toString());
          await tx.fondoCeseMovimiento.create({
            data: {
              fondoCeseCuentaId: fondoCuenta.id,
              tipo: "RETIRO_CESE",
              eventoDesvinculacionId: eventoId,
              monto: saldo.negated().toString(),
              saldoResultante: "0",
              fecha: evento.fechaEgreso,
              descripcion: `Retiro Fondo de Cese Laboral — ${evento.legajo.apellido}, ${evento.legajo.nombre}`,
            },
          });
          await tx.fondoCeseCuenta.update({ where: { id: fondoCuenta.id }, data: { saldoActual: 0 } });
        }
        return;
      }

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
    revalidatePath(`/empresas/${evento.empresaId}/legajos/${evento.legajoId}`);
    revalidatePath(`/empresas/${evento.empresaId}/fal`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al confirmar la desvinculación." };
  }
}
