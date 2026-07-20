"use server";

import { db } from "@/lib/db";
import { requireEmpresaAccess, requireEscritura, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { getTasasVigentes } from "@/lib/tasas";
import { calcularLiquidacionMensual } from "@/lib/payroll/mensual";
import { calcularContribucionMensualFAL } from "@/lib/payroll/fal";
import { antiguedadEnAnios } from "@/lib/payroll/vacaciones";
import { calcularAntiguedadImporte } from "@/lib/payroll/convenio";
import { money, sum, type Money } from "@/lib/payroll/money";
import type { ConceptoInput } from "@/lib/payroll/types";

/**
 * Título II, Ley 27.802: el Fondo de Asistencia Laboral entra en vigencia este día.
 * Fecha fijada por el Decreto 408/2026 (reglamentario), que hizo uso de la prórroga de
 * hasta 6 meses prevista en la ley — no la fecha original de la ley (01/06/2026).
 */
const FAL_FECHA_VIGENCIA = new Date("2026-11-01T00:00:00.000Z");

/** Título XX Ley 27.802 (RIFL, Dec. 315/2026): ventana de altas elegibles. */
const RIFL_VENTANA_DESDE = new Date("2026-05-01T00:00:00.000Z");
const RIFL_VENTANA_HASTA = new Date("2027-04-30T23:59:59.999Z");
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/empresas";
import type { Prisma } from "@/generated/prisma/client";
import { createHash } from "node:crypto";

function diasEnMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate();
}

function esMesSAC(mes: number): boolean {
  return mes === 6 || mes === 12;
}

/** Constancia de emisión del recibo (Dec. 407/2026): huella estable, no reproducible sin los datos originales. */
function calcularHashRecibo(liquidacionId: string, neto: string, emitidoEn: Date): string {
  return createHash("sha256").update(`${liquidacionId}|${neto}|${emitidoEn.toISOString()}`).digest("hex");
}

export async function listarPeriodos(empresaId: string) {
  try {
    await requireEmpresaAccess(empresaId);
    const periodos = await db.periodoLiquidacion.findMany({
      where: { empresaId },
      orderBy: [{ anio: "desc" }, { mes: "desc" }],
      include: { _count: { select: { liquidaciones: true } } },
    });
    return { ok: true as const, data: periodos };
  } catch (err) {
    return { ok: false as const, error: err instanceof AuthzError ? err.message : "Error al listar períodos." };
  }
}

export async function obtenerPeriodo(periodoId: string) {
  try {
    const periodo = await db.periodoLiquidacion.findUnique({
      where: { id: periodoId },
      include: {
        empresa: true,
        liquidaciones: { include: { legajo: true, conceptos: { include: { conceptoDefinicion: true }, orderBy: { orden: "asc" } } } },
      },
    });
    if (!periodo) return { ok: false as const, error: "Período no encontrado." };
    await requireEmpresaAccess(periodo.empresaId);
    return { ok: true as const, data: periodo };
  } catch (err) {
    return { ok: false as const, error: err instanceof AuthzError ? err.message : "Error al obtener el período." };
  }
}

export async function crearPeriodoLiquidacion(
  empresaId: string,
  anio: number,
  mes: number,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireEscritura(empresaId);
    const periodo = await db.periodoLiquidacion.upsert({
      where: { empresaId_anio_mes: { empresaId, anio, mes } },
      update: {},
      create: { empresaId, anio, mes },
    });
    revalidatePath(`/empresas/${empresaId}/liquidaciones`);
    return { ok: true, data: { id: periodo.id } };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al crear el período." };
  }
}

/** Concepto ya persistido de una liquidación anterior (para recalcular preservando conceptos manuales). */
interface ConceptoManualGuardado {
  conceptoDefinicionId: string;
  monto: string;
  cantidad?: string;
  montoUnitario?: string;
  consentimientoFirmado?: boolean;
}

async function calcularYGuardarLiquidacionLegajo(params: {
  periodoId: string;
  empresaId: string;
  anio: number;
  mes: number;
  legajoId: string;
  usuarioId: string;
  conceptosManuales: ConceptoManualGuardado[];
}) {
  const legajo = await db.legajo.findUniqueOrThrow({
    where: { id: params.legajoId },
    include: { categoria: true },
  });
  const tasas = await getTasasVigentes(params.empresaId, new Date(params.anio, params.mes - 1, 1));

  const dias = diasEnMes(params.anio, params.mes);
  const sacEsteMes = esMesSAC(params.mes);
  const finDePeriodo = new Date(Date.UTC(params.anio, params.mes, 0));
  const antiguedadAnios = antiguedadEnAnios(legajo.fechaIngreso, finDePeriodo);
  const remuneracionNoRemunerativa = money(legajo.categoria.remuneracionNoRemunerativa.toString());
  const tieneNoRemunerativo = remuneracionNoRemunerativa.gt(0);
  const aplicaRIFL =
    legajo.regimenRIFL &&
    !!legajo.regimenRIFLFechaAlta &&
    legajo.regimenRIFLFechaAlta >= RIFL_VENTANA_DESDE &&
    legajo.regimenRIFLFechaAlta <= RIFL_VENTANA_HASTA;

  let mejorRemuneracionSemestre: Money | undefined;
  let mejorNoRemuneracionSemestre: Money | undefined;
  if (sacEsteMes) {
    const mesesSemestre = params.mes === 6 ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12];
    const historico = await db.liquidacionMensual.findMany({
      where: {
        legajoId: params.legajoId,
        periodo: { anio: params.anio, mes: { in: mesesSemestre } },
        estado: { not: "ANULADA" },
      },
      select: { totalRemunerativo: true, totalNoRemunerativo: true },
    });
    const remuneraciones = historico.map((h) => money(h.totalRemunerativo.toString()));
    // Si no hay historial previo en el semestre (primer período del legajo o recién cargado
    // en el sistema), usamos como piso básico + antigüedad estimada — no solo el básico —
    // para no subestimar el SAC de un legajo con antigüedad ya reconocida.
    const sueldoBasicoLegajo = money(legajo.sueldoBasico.toString());
    const pisoRemunerativo =
      antiguedadAnios > 0
        ? sueldoBasicoLegajo.plus(calcularAntiguedadImporte(sueldoBasicoLegajo, antiguedadAnios, tasas.antiguedadPorcentajeAnio))
        : sueldoBasicoLegajo;
    remuneraciones.push(pisoRemunerativo);
    mejorRemuneracionSemestre = remuneraciones.reduce((max, v) => (v.gt(max) ? v : max), money(0));

    if (tieneNoRemunerativo) {
      const remuneracionesNR = historico.map((h) => money(h.totalNoRemunerativo.toString()));
      const pisoNoRemunerativo =
        antiguedadAnios > 0
          ? remuneracionNoRemunerativa.plus(
              calcularAntiguedadImporte(remuneracionNoRemunerativa, antiguedadAnios, tasas.antiguedadPorcentajeAnio),
            )
          : remuneracionNoRemunerativa;
      remuneracionesNR.push(pisoNoRemunerativo);
      mejorNoRemuneracionSemestre = remuneracionesNR.reduce((max, v) => (v.gt(max) ? v : max), money(0));
    }
  }

  const conceptosDefinicion = await db.conceptoDefinicion.findMany({
    where: { id: { in: params.conceptosManuales.map((c) => c.conceptoDefinicionId) } },
  });

  const conceptosInput: ConceptoInput[] = params.conceptosManuales.map((cm) => {
    const def = conceptosDefinicion.find((d) => d.id === cm.conceptoDefinicionId);
    if (!def) throw new Error(`Concepto ${cm.conceptoDefinicionId} no encontrado en el catálogo.`);
    return {
      id: def.id,
      codigo: def.codigo,
      nombre: def.nombre,
      tipo: def.tipo,
      subtipo: def.subtipo ?? undefined,
      monto: money(cm.monto),
      cantidad: cm.cantidad ? money(cm.cantidad) : undefined,
      montoUnitario: cm.montoUnitario ? money(cm.montoUnitario) : undefined,
      afectaAportes: def.afectaAportes,
      afectaContribuciones: def.afectaContribuciones,
      afectaSAC: def.afectaSAC,
      esVariable: def.esVariable,
      requiereConsentimiento: def.requiereConsentimiento,
      consentimientoFirmado: cm.consentimientoFirmado ?? false,
    };
  });

  const resultado = calcularLiquidacionMensual({
    legajo: {
      sueldoBasico: money(legajo.sueldoBasico.toString()),
      horasSemanales: legajo.horasSemanales ? money(legajo.horasSemanales.toString()) : undefined,
      horasSemanalesFullTime: money(legajo.horasSemanalesFullTime.toString()),
      modalidadRemuneracion: legajo.modalidadRemuneracion,
      antiguedadAnios,
      remuneracionNoRemunerativa: tieneNoRemunerativo ? remuneracionNoRemunerativa : undefined,
      afiliadoSindical: legajo.afiliadoSindical,
      aplicaRIFL,
    },
    anio: params.anio,
    mes: params.mes,
    diasTrabajados: dias,
    diasEnMes: dias,
    esMesSAC: sacEsteMes,
    mejorRemuneracionSemestre,
    mejorNoRemuneracionSemestre,
    conceptos: conceptosInput,
    tasas,
  });

  // Mapeo de conceptos sintéticos/de convenio (BASICO/SAC/APORTES/antigüedad/presentismo/
  // espejo no remunerativo/deducciones de convenio) a ConceptoDefinicion global por código.
  const codigosSinteticos = [
    "BASICO",
    "SAC",
    "SAC_NR",
    "APORTES",
    "10002",
    "10003",
    "20001",
    "20002",
    "20003",
    "30004",
    "30005",
    "30006",
    "30007",
    "30008",
    "30009",
    "30010",
    "CP_JUBILACION",
    "CP_LEY19032",
    "CP_OBRA_SOCIAL",
    "CP_ASIG_FAMILIARES",
    "CP_FNE",
    "CP_ART",
    "CP_SVO",
  ];
  const catalogoSintetico = await db.conceptoDefinicion.findMany({
    where: { empresaId: null, codigo: { in: codigosSinteticos } },
  });

  const snapshotInput: Prisma.InputJsonValue = {
    anio: params.anio,
    mes: params.mes,
    diasTrabajados: dias,
    diasEnMes: dias,
    esMesSAC: sacEsteMes,
    mejorRemuneracionSemestre: mejorRemuneracionSemestre?.toString() ?? null,
    conceptosManuales: params.conceptosManuales as unknown as Prisma.InputJsonValue,
  };

  const liquidacion = await db.$transaction(async (tx) => {
    const liq = await tx.liquidacionMensual.upsert({
      where: { periodoId_legajoId: { periodoId: params.periodoId, legajoId: params.legajoId } },
      update: {
        diasTrabajados: dias,
        totalRemunerativo: resultado.totalRemunerativo.toString(),
        totalNoRemunerativo: resultado.totalNoRemunerativo.toString(),
        totalDeducciones: resultado.totalDeducciones.toString(),
        totalContribucionesPatronales: resultado.totalContribucionesPatronales.toString(),
        neto: resultado.neto.toString(),
        snapshotInputJson: snapshotInput,
        calculadoPorUsuarioId: params.usuarioId,
      },
      create: {
        periodoId: params.periodoId,
        legajoId: params.legajoId,
        diasTrabajados: dias,
        totalRemunerativo: resultado.totalRemunerativo.toString(),
        totalNoRemunerativo: resultado.totalNoRemunerativo.toString(),
        totalDeducciones: resultado.totalDeducciones.toString(),
        totalContribucionesPatronales: resultado.totalContribucionesPatronales.toString(),
        neto: resultado.neto.toString(),
        snapshotInputJson: snapshotInput,
        calculadoPorUsuarioId: params.usuarioId,
      },
    });

    await tx.conceptoLiquidacion.deleteMany({ where: { liquidacionId: liq.id } });

    let orden = 0;
    for (const c of resultado.conceptos) {
      if (c.bloqueado) continue;
      const defId =
        catalogoSintetico.find((d) => d.codigo === c.codigo)?.id ??
        conceptosDefinicion.find((d) => d.id === c.id)?.id;
      if (!defId) continue;
      await tx.conceptoLiquidacion.create({
        data: {
          liquidacionId: liq.id,
          conceptoDefinicionId: defId,
          descripcion: c.nombre,
          cantidad: c.cantidad?.toString(),
          montoUnitario: c.montoUnitario?.toString(),
          monto: c.montoAjustado.toString(),
          consentimientoFirmado: c.consentimientoFirmado,
          orden: orden++,
        },
      });
    }

    return liq;
  });

  return { liquidacion, warnings: resultado.warnings };
}

export async function calcularLiquidacionPeriodo(periodoId: string): Promise<ActionResult<{ warnings: string[] }>> {
  try {
    const periodo = await db.periodoLiquidacion.findUniqueOrThrow({ where: { id: periodoId } });
    const session = await requireEscritura(periodo.empresaId);
    if (periodo.estado !== "BORRADOR") {
      return { ok: false, error: "Solo se pueden recalcular períodos en borrador." };
    }

    const legajos = await db.legajo.findMany({ where: { empresaId: periodo.empresaId, situacion: "ACTIVO" } });
    const warnings: string[] = [];

    for (const legajo of legajos) {
      const existente = await db.liquidacionMensual.findUnique({
        where: { periodoId_legajoId: { periodoId, legajoId: legajo.id } },
      });
      const conceptosManuales: ConceptoManualGuardado[] = existente
        ? ((existente.snapshotInputJson as { conceptosManuales?: ConceptoManualGuardado[] })?.conceptosManuales ?? [])
        : [];

      const { warnings: w } = await calcularYGuardarLiquidacionLegajo({
        periodoId,
        empresaId: periodo.empresaId,
        anio: periodo.anio,
        mes: periodo.mes,
        legajoId: legajo.id,
        usuarioId: session.user.id,
        conceptosManuales,
      });
      warnings.push(...w.map((msg) => `${legajo.apellido}, ${legajo.nombre}: ${msg}`));
    }

    await logAudit({
      usuarioId: session.user.id,
      accion: "PERIODO_CALCULADO",
      entidad: "PeriodoLiquidacion",
      entidadId: periodoId,
      detalle: { cantidadLegajos: legajos.length },
    });

    revalidatePath(`/empresas/${periodo.empresaId}/liquidaciones/${periodoId}`);
    return { ok: true, data: { warnings } };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al calcular el período." };
  }
}

export async function agregarConceptoManual(
  liquidacionId: string,
  concepto: ConceptoManualGuardado,
): Promise<ActionResult> {
  try {
    const liquidacion = await db.liquidacionMensual.findUniqueOrThrow({
      where: { id: liquidacionId },
      include: { periodo: true },
    });
    const session = await requireEscritura(liquidacion.periodo.empresaId);
    if (liquidacion.periodo.estado !== "BORRADOR") {
      return { ok: false, error: "El período ya fue confirmado, no se pueden agregar conceptos." };
    }

    const existentes =
      (liquidacion.snapshotInputJson as { conceptosManuales?: ConceptoManualGuardado[] })?.conceptosManuales ?? [];

    await calcularYGuardarLiquidacionLegajo({
      periodoId: liquidacion.periodoId,
      empresaId: liquidacion.periodo.empresaId,
      anio: liquidacion.periodo.anio,
      mes: liquidacion.periodo.mes,
      legajoId: liquidacion.legajoId,
      usuarioId: session.user.id,
      conceptosManuales: [...existentes, concepto],
    });

    revalidatePath(`/empresas/${liquidacion.periodo.empresaId}/liquidaciones/${liquidacion.periodoId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al agregar el concepto." };
  }
}

export async function confirmarPeriodo(periodoId: string): Promise<ActionResult> {
  try {
    const periodo = await db.periodoLiquidacion.findUniqueOrThrow({
      where: { id: periodoId },
      include: { empresa: true, liquidaciones: true },
    });
    const session = await requireEscritura(periodo.empresaId);

    const fechaPeriodo = new Date(Date.UTC(periodo.anio, periodo.mes - 1, 1));

    await db.$transaction(async (tx) => {
      await tx.periodoLiquidacion.update({ where: { id: periodoId }, data: { estado: "CONFIRMADO" } });
      await tx.liquidacionMensual.updateMany({ where: { periodoId }, data: { estado: "CONFIRMADA" } });

      // Constancia de emisión del recibo (Dec. 407/2026): se fija una única vez, al confirmar
      // — no se recalcula en cada descarga del PDF, para que el hash sea una prueba estable.
      const emitidoEn = new Date();
      for (const liq of periodo.liquidaciones) {
        if (liq.reciboEmitidoEn) continue;
        const hash = calcularHashRecibo(liq.id, liq.neto.toString(), emitidoEn);
        await tx.liquidacionMensual.update({
          where: { id: liq.id },
          data: { reciboEmitidoEn: emitidoEn, reciboHash: hash },
        });
      }

      // Título II: devengamiento de la contribución mensual al FAL, solo a partir de su vigencia.
      if (fechaPeriodo >= FAL_FECHA_VIGENCIA && periodo.liquidaciones.length > 0) {
        const falCuenta = await tx.falCuenta.upsert({
          where: { empresaId: periodo.empresaId },
          update: {},
          create: { empresaId: periodo.empresaId, fechaAlta: FAL_FECHA_VIGENCIA, saldoActual: 0 },
        });

        const yaDevengado = await tx.falMovimiento.findFirst({
          where: { falCuentaId: falCuenta.id, periodoId, tipo: "CONTRIBUCION_MENSUAL" },
        });

        if (!yaDevengado) {
          const baseImponibleTotalPeriodo = sum(periodo.liquidaciones.map((l) => l.totalRemunerativo.toString()));
          const tamanoFal = periodo.empresa.tamano === "GRANDE" ? "GRANDE" : "PYME";
          const tasas = await getTasasVigentes(periodo.empresaId, fechaPeriodo);
          const contribucion = calcularContribucionMensualFAL(baseImponibleTotalPeriodo, tamanoFal, tasas);
          const nuevoSaldo = money(falCuenta.saldoActual.toString()).plus(contribucion);

          await tx.falMovimiento.create({
            data: {
              falCuentaId: falCuenta.id,
              tipo: "CONTRIBUCION_MENSUAL",
              periodoId,
              monto: contribucion.toString(),
              saldoResultante: nuevoSaldo.toString(),
              fecha: fechaPeriodo,
              descripcion: `Contribución FAL ${periodo.mes}/${periodo.anio}`,
            },
          });
          await tx.falCuenta.update({ where: { id: falCuenta.id }, data: { saldoActual: nuevoSaldo.toString() } });
        }
      }
    });

    await logAudit({
      usuarioId: session.user.id,
      accion: "PERIODO_CONFIRMADO",
      entidad: "PeriodoLiquidacion",
      entidadId: periodoId,
    });

    revalidatePath(`/empresas/${periodo.empresaId}/liquidaciones/${periodoId}`);
    revalidatePath(`/empresas/${periodo.empresaId}/fal`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al confirmar el período." };
  }
}

export async function listarCatalogoConceptos(empresaId: string) {
  try {
    await requireEmpresaAccess(empresaId);
    const conceptos = await db.conceptoDefinicion.findMany({
      where: {
        OR: [{ empresaId: null }, { empresaId }],
        activo: true,
        codigo: { notIn: ["BASICO", "SAC", "APORTES"] },
      },
      orderBy: { ordenImpresion: "asc" },
    });
    return { ok: true as const, data: conceptos };
  } catch (err) {
    return { ok: false as const, error: err instanceof AuthzError ? err.message : "Error al listar el catálogo." };
  }
}
