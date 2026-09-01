"use server";

import { db } from "@/lib/db";
import { requireEmpresaAccess, requireEscritura, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { getTasasVigentes } from "@/lib/tasas";
import { calcularLiquidacionMensual } from "@/lib/payroll/mensual";
import { calcularContribucionMensualFAL } from "@/lib/payroll/fal";
import { antiguedadEnAnios } from "@/lib/payroll/vacaciones";
import { calcularAntiguedadImporte } from "@/lib/payroll/convenio";
import {
  CODIGOS_SINTETICOS,
  conceptoSinteticoPorCodigo,
} from "@/lib/payroll/conceptosSinteticos";
import { calcularRetencionGanancias } from "@/lib/payroll/ganancias";
import { calcularDiasNoPagadosPorLicencias } from "@/lib/payroll/licencias";
import { money, sum, type Money } from "@/lib/payroll/money";
import type { ConceptoInput } from "@/lib/payroll/types";
import { horaExtraSchema } from "@/lib/validation/liquidaciones";

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
  /** Si el concepto se cargó como porcentaje: fracción (0.04 = 4%) y base sobre la que se calculó `monto`. */
  porcentaje?: string;
  baseCalculo?: "REMUNERATIVO" | "NO_REMUNERATIVO" | "HABERES" | "BASICO";
}

/** Hora extra del período, guardada en `snapshotInputJson.horasExtra`. */
interface HoraExtraGuardada {
  horas: string;
  recargo: 50 | 100;
  modalidad: "PAGO" | "BANCO_HORAS" | "FRANCO_COMPENSATORIO";
}

async function calcularYGuardarLiquidacionLegajo(params: {
  periodoId: string;
  empresaId: string;
  anio: number;
  mes: number;
  legajoId: string;
  usuarioId: string;
  conceptosManuales: ConceptoManualGuardado[];
  horasExtra: HoraExtraGuardada[];
}) {
  const legajo = await db.legajo.findUniqueOrThrow({
    where: { id: params.legajoId },
    include: { categoria: true, gananciasConfig: true },
  });
  const tasas = await getTasasVigentes(params.empresaId, new Date(params.anio, params.mes - 1, 1));

  const dias = diasEnMes(params.anio, params.mes);
  const sacEsteMes = esMesSAC(params.mes);
  const finDePeriodo = new Date(Date.UTC(params.anio, params.mes, 0));
  const antiguedadAnios = antiguedadEnAnios(legajo.fechaIngreso, finDePeriodo);

  // Licencias que se solapan con el mes → días que no se pagan (se restan del prorrateo).
  const inicioDePeriodo = new Date(Date.UTC(params.anio, params.mes - 1, 1));
  const licenciasDelMes = await db.licencia.findMany({
    where: { legajoId: params.legajoId, desde: { lte: finDePeriodo }, hasta: { gte: inicioDePeriodo } },
  });
  const lic = calcularDiasNoPagadosPorLicencias(licenciasDelMes, params.anio, params.mes);
  const diasTrabajadosEfectivos = Math.max(0, dias - lic.diasNoPagados);
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
      porcentaje: cm.porcentaje ? money(cm.porcentaje) : undefined,
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
    diasTrabajados: diasTrabajadosEfectivos,
    diasEnMes: dias,
    esMesSAC: sacEsteMes,
    mejorRemuneracionSemestre,
    mejorNoRemuneracionSemestre,
    conceptos: conceptosInput,
    horasExtra: params.horasExtra.map((h) => ({
      horas: money(h.horas),
      recargo: h.recargo,
      modalidad: h.modalidad,
    })),
    tasas,
  });

  resultado.warnings.push(...lic.warnings);

  // --- Retención de Impuesto a las Ganancias (opt-in por legajo, cálculo acumulado RG 4003) ---
  let retencionGanancias = money(0);
  let acumGananciasNuevo:
    | { gananciaNetaAcum: string; impuestoDeterminadoAcum: string; retenidoAcum: string }
    | null = null;
  if (legajo.gananciasConfig?.liquidaGanancias) {
    const parametro = await db.gananciasParametro.findFirst({
      where: {
        vigenciaDesde: { lte: finDePeriodo },
        OR: [{ vigenciaHasta: null }, { vigenciaHasta: { gt: finDePeriodo } }],
      },
      orderBy: { vigenciaDesde: "desc" },
      include: { tramos: true },
    });
    if (!parametro) {
      resultado.warnings.push(
        "Ganancias: no hay parámetros vigentes cargados — no se calculó la retención.",
      );
    } else {
      const acumPrevio = await db.gananciasAcumulado.findFirst({
        where: {
          legajoId: params.legajoId,
          OR: [{ anio: { lt: params.anio } }, { anio: params.anio, mes: { lt: params.mes } }],
        },
        orderBy: [{ anio: "desc" }, { mes: "desc" }],
      });
      const deduccionesGeneralesMes = resultado.conceptos
        .filter((c) => c.tipo === "DEDUCCION" && (c.codigo === "APORTES" || c.subtipo === "SINDICAL"))
        .reduce((acc, c) => acc.plus(c.montoAjustado), money(0));
      const rg = calcularRetencionGanancias({
        mes: params.mes,
        esMesSAC: sacEsteMes,
        remBrutaMes: resultado.totalRemunerativo,
        deduccionesGeneralesMes,
        otrasDeduccionesMes: money(legajo.gananciasConfig.otrasDeduccionesMensuales.toString()),
        computaConyuge: legajo.gananciasConfig.computaConyuge,
        cantidadHijos: legajo.gananciasConfig.cantidadHijosACargo,
        acumPrevio: {
          gananciaNetaAcum: money((acumPrevio?.gananciaNetaAcum ?? 0).toString()),
          retenidoAcum: money((acumPrevio?.retenidoAcum ?? 0).toString()),
        },
        parametro: {
          mni: money(parametro.mni.toString()),
          deduccionEspecial: money(parametro.deduccionEspecial.toString()),
          deduccionConyuge: money(parametro.deduccionConyuge.toString()),
          deduccionHijo: money(parametro.deduccionHijo.toString()),
          tramos: parametro.tramos.map((t) => ({
            desde: money(t.desde.toString()),
            hasta: t.hasta != null ? money(t.hasta.toString()) : null,
            montoFijo: money(t.montoFijo.toString()),
            porcentaje: money(t.porcentaje.toString()),
          })),
        },
      });
      resultado.warnings.push(...rg.warnings.map((w) => `Ganancias: ${w}`));
      retencionGanancias = rg.retencionMes.gt(0) ? rg.retencionMes : money(0);
      if (rg.retencionMes.lt(0)) {
        resultado.warnings.push(
          `Ganancias: corresponde devolución de $${rg.retencionMes.abs().toFixed(2)} — se registra en el acumulado pero no se descuenta acá.`,
        );
      }
      acumGananciasNuevo = {
        gananciaNetaAcum: rg.gananciaNetaAcum.toString(),
        impuestoDeterminadoAcum: rg.impuestoDeterminadoAcum.toString(),
        retenidoAcum: rg.retenidoAcum.toString(),
      };
    }
  }
  // --- Adelantos / anticipos de sueldo pendientes de descontar ---
  // Se toman los que están sin imputar y también los que ya se imputaron a ESTA misma
  // liquidación (recálculo del período): dentro de la transacción se liberan y se vuelven
  // a imputar, así el descuento acompaña al recálculo.
  const liqPrevia = await db.liquidacionMensual.findUnique({
    where: { periodoId_legajoId: { periodoId: params.periodoId, legajoId: params.legajoId } },
    select: { id: true },
  });
  const adelantosPendientes = await db.adelantoSueldo.findMany({
    where: {
      legajoId: params.legajoId,
      OR: [
        { aplicadoEnLiquidacionId: null },
        ...(liqPrevia ? [{ aplicadoEnLiquidacionId: liqPrevia.id }] : []),
      ],
    },
    orderBy: { fecha: "asc" },
  });
  const totalAdelantos = adelantosPendientes.reduce((acc, a) => acc.plus(money(a.monto.toString())), money(0));
  const adelantoIdsAAplicar = adelantosPendientes.map((a) => a.id);
  const netoAntesAdelantos = resultado.neto.minus(retencionGanancias);
  if (totalAdelantos.gt(0) && netoAntesAdelantos.gt(0) && totalAdelantos.gt(netoAntesAdelantos.times(0.2))) {
    resultado.warnings.push(
      `Adelantos: el descuento ($${totalAdelantos.toFixed(2)}) supera el 20% del neto — revisá el tope del art. 133 LCT o dividí el anticipo en varias cuotas.`,
    );
  }

  const totalDeduccionesFinal = resultado.totalDeducciones.plus(retencionGanancias).plus(totalAdelantos);
  const netoFinal = resultado.neto.minus(retencionGanancias).minus(totalAdelantos);

  // Anclaje de cada línea que produjo el motor (BASICO/SAC/APORTES/antigüedad/presentismo/
  // espejo no remunerativo/deducciones de convenio/contribuciones patronales) a un
  // `ConceptoDefinicion` global por código. Los conceptos sintéticos que falten en el
  // catálogo se autocrean desde `CONCEPTOS_SINTETICOS`: descartarlos en silencio dejaría el
  // detalle del recibo sin una deducción/haber que ya está sumada en los totales
  // (era el caso de "IPS FSA" cuando faltaba su fila de catálogo).
  const catalogoSintetico = await db.conceptoDefinicion.findMany({
    where: { empresaId: null, codigo: { in: CODIGOS_SINTETICOS } },
  });
  const sinteticoIdPorCodigo = new Map(catalogoSintetico.map((d) => [d.codigo, d.id] as const));

  const idsManuales = new Set(conceptosDefinicion.map((d) => d.id));
  const codigosSinteticosFaltantes = new Set<string>();
  for (const c of resultado.conceptos) {
    if (c.bloqueado || idsManuales.has(c.id) || sinteticoIdPorCodigo.has(c.codigo)) continue;
    codigosSinteticosFaltantes.add(c.codigo);
  }
  if (retencionGanancias.gt(0) && !sinteticoIdPorCodigo.has("RET_GANANCIAS")) {
    codigosSinteticosFaltantes.add("RET_GANANCIAS");
  }
  if (totalAdelantos.gt(0) && !sinteticoIdPorCodigo.has("ADELANTO_SUELDO")) {
    codigosSinteticosFaltantes.add("ADELANTO_SUELDO");
  }
  for (const codigo of codigosSinteticosFaltantes) {
    const def = conceptoSinteticoPorCodigo(codigo);
    if (!def) {
      throw new Error(
        `El motor generó el concepto "${codigo}", que no está en CONCEPTOS_SINTETICOS ni en el catálogo.`,
      );
    }
    try {
      const creado = await db.conceptoDefinicion.create({
        data: {
          codigo: def.codigo,
          codigoArca: def.codigoArca,
          nombre: def.nombre,
          tipo: def.tipo,
          subtipo: def.subtipo,
          rubroRecibo: def.rubroRecibo,
          afectaAportes: def.afectaAportes,
          afectaContribuciones: def.afectaContribuciones,
          afectaSAC: def.afectaSAC,
          ordenImpresion: def.ordenImpresion,
        },
      });
      sinteticoIdPorCodigo.set(codigo, creado.id);
    } catch (err) {
      // Carrera con otra liquidación que creó el mismo concepto en paralelo: re-buscar.
      if (err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002") {
        const existente = await db.conceptoDefinicion.findFirst({
          where: { empresaId: null, codigo },
        });
        if (!existente) throw err;
        sinteticoIdPorCodigo.set(codigo, existente.id);
      } else {
        throw err;
      }
    }
  }

  const snapshotInput: Prisma.InputJsonValue = {
    anio: params.anio,
    mes: params.mes,
    diasTrabajados: diasTrabajadosEfectivos,
    diasEnMes: dias,
    esMesSAC: sacEsteMes,
    mejorRemuneracionSemestre: mejorRemuneracionSemestre?.toString() ?? null,
    conceptosManuales: params.conceptosManuales as unknown as Prisma.InputJsonValue,
    horasExtra: params.horasExtra as unknown as Prisma.InputJsonValue,
  };

  const liquidacion = await db.$transaction(async (tx) => {
    const liq = await tx.liquidacionMensual.upsert({
      where: { periodoId_legajoId: { periodoId: params.periodoId, legajoId: params.legajoId } },
      update: {
        diasTrabajados: diasTrabajadosEfectivos,
        totalRemunerativo: resultado.totalRemunerativo.toString(),
        totalNoRemunerativo: resultado.totalNoRemunerativo.toString(),
        totalDeducciones: totalDeduccionesFinal.toString(),
        totalContribucionesPatronales: resultado.totalContribucionesPatronales.toString(),
        neto: netoFinal.toString(),
        snapshotInputJson: snapshotInput,
        calculadoPorUsuarioId: params.usuarioId,
      },
      create: {
        periodoId: params.periodoId,
        legajoId: params.legajoId,
        diasTrabajados: diasTrabajadosEfectivos,
        totalRemunerativo: resultado.totalRemunerativo.toString(),
        totalNoRemunerativo: resultado.totalNoRemunerativo.toString(),
        totalDeducciones: totalDeduccionesFinal.toString(),
        totalContribucionesPatronales: resultado.totalContribucionesPatronales.toString(),
        neto: netoFinal.toString(),
        snapshotInputJson: snapshotInput,
        calculadoPorUsuarioId: params.usuarioId,
      },
    });

    await tx.conceptoLiquidacion.deleteMany({ where: { liquidacionId: liq.id } });

    let orden = 0;
    for (const c of resultado.conceptos) {
      if (c.bloqueado) continue;
      const defId =
        conceptosDefinicion.find((d) => d.id === c.id)?.id ?? sinteticoIdPorCodigo.get(c.codigo);
      if (!defId) {
        throw new Error(`No se pudo mapear el concepto "${c.codigo}" a un ConceptoDefinicion.`);
      }
      await tx.conceptoLiquidacion.create({
        data: {
          liquidacionId: liq.id,
          conceptoDefinicionId: defId,
          descripcion: c.nombre,
          cantidad: c.cantidad?.toString(),
          montoUnitario: c.montoUnitario?.toString(),
          monto: c.montoAjustado.toString(),
          porcentaje: c.porcentaje?.toString(),
          consentimientoFirmado: c.consentimientoFirmado,
          orden: orden++,
        },
      });
    }

    if (retencionGanancias.gt(0)) {
      const defId = sinteticoIdPorCodigo.get("RET_GANANCIAS");
      if (!defId) throw new Error('No se pudo mapear "RET_GANANCIAS" a un ConceptoDefinicion.');
      await tx.conceptoLiquidacion.create({
        data: {
          liquidacionId: liq.id,
          conceptoDefinicionId: defId,
          descripcion: "Retención Impuesto a las Ganancias",
          monto: retencionGanancias.toString(),
          orden: orden++,
        },
      });
    }

    if (acumGananciasNuevo) {
      await tx.gananciasAcumulado.upsert({
        where: {
          legajoId_anio_mes: { legajoId: params.legajoId, anio: params.anio, mes: params.mes },
        },
        create: { legajoId: params.legajoId, anio: params.anio, mes: params.mes, ...acumGananciasNuevo },
        update: { ...acumGananciasNuevo },
      });
    }

    // Adelantos: se liberan los que estuvieran imputados a esta liquidación y se re-imputan
    // los pendientes tomados arriba, para que el recálculo del período sea idempotente.
    await tx.adelantoSueldo.updateMany({
      where: { aplicadoEnLiquidacionId: liq.id },
      data: { aplicadoEnLiquidacionId: null },
    });
    if (totalAdelantos.gt(0)) {
      const defId = sinteticoIdPorCodigo.get("ADELANTO_SUELDO");
      if (!defId) throw new Error('No se pudo mapear "ADELANTO_SUELDO" a un ConceptoDefinicion.');
      await tx.conceptoLiquidacion.create({
        data: {
          liquidacionId: liq.id,
          conceptoDefinicionId: defId,
          descripcion:
            adelantosPendientes.length === 1
              ? "Adelanto de sueldo"
              : `Adelantos de sueldo (${adelantosPendientes.length})`,
          monto: totalAdelantos.toString(),
          orden: orden++,
        },
      });
      await tx.adelantoSueldo.updateMany({
        where: { id: { in: adelantoIdsAAplicar } },
        data: { aplicadoEnLiquidacionId: liq.id },
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
      const snap = existente?.snapshotInputJson as
        | { conceptosManuales?: ConceptoManualGuardado[]; horasExtra?: HoraExtraGuardada[] }
        | undefined;

      const { warnings: w } = await calcularYGuardarLiquidacionLegajo({
        periodoId,
        empresaId: periodo.empresaId,
        anio: periodo.anio,
        mes: periodo.mes,
        legajoId: legajo.id,
        usuarioId: session.user.id,
        conceptosManuales: snap?.conceptosManuales ?? [],
        horasExtra: snap?.horasExtra ?? [],
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

/**
 * Reescribe los conceptos manuales de una liquidación (borrador) aplicando `mutar` a la
 * lista actual, y recalcula. Base de agregar / editar / eliminar concepto manual.
 */
async function mutarConceptosManuales(
  liquidacionId: string,
  mutar: (actuales: ConceptoManualGuardado[]) => ConceptoManualGuardado[] | { error: string },
): Promise<ActionResult> {
  try {
    const liquidacion = await db.liquidacionMensual.findUniqueOrThrow({
      where: { id: liquidacionId },
      include: { periodo: true },
    });
    const session = await requireEscritura(liquidacion.periodo.empresaId);
    if (liquidacion.periodo.estado !== "BORRADOR") {
      return { ok: false, error: "El período ya fue confirmado, no se pueden modificar conceptos." };
    }

    const snap = liquidacion.snapshotInputJson as {
      conceptosManuales?: ConceptoManualGuardado[];
      horasExtra?: HoraExtraGuardada[];
    };
    const resultado = mutar(snap?.conceptosManuales ?? []);
    if (!Array.isArray(resultado)) return { ok: false, error: resultado.error };

    await calcularYGuardarLiquidacionLegajo({
      periodoId: liquidacion.periodoId,
      empresaId: liquidacion.periodo.empresaId,
      anio: liquidacion.periodo.anio,
      mes: liquidacion.periodo.mes,
      legajoId: liquidacion.legajoId,
      usuarioId: session.user.id,
      conceptosManuales: resultado,
      horasExtra: snap?.horasExtra ?? [],
    });

    revalidatePath(`/empresas/${liquidacion.periodo.empresaId}/liquidaciones/${liquidacion.periodoId}`);
    revalidatePath(
      `/empresas/${liquidacion.periodo.empresaId}/liquidaciones/${liquidacion.periodoId}/${liquidacionId}`,
    );
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al guardar el concepto." };
  }
}

export async function agregarConceptoManual(
  liquidacionId: string,
  concepto: ConceptoManualGuardado,
): Promise<ActionResult> {
  return await mutarConceptosManuales(liquidacionId, (actuales) => [...actuales, concepto]);
}

export async function editarConceptoManual(
  liquidacionId: string,
  indice: number,
  concepto: ConceptoManualGuardado,
): Promise<ActionResult> {
  return await mutarConceptosManuales(liquidacionId, (actuales) => {
    if (indice < 0 || indice >= actuales.length) return { error: "Concepto no encontrado." };
    return actuales.map((c, i) => (i === indice ? concepto : c));
  });
}

export async function eliminarConceptoManual(
  liquidacionId: string,
  indice: number,
): Promise<ActionResult> {
  return await mutarConceptosManuales(liquidacionId, (actuales) => {
    if (indice < 0 || indice >= actuales.length) return { error: "Concepto no encontrado." };
    return actuales.filter((_, i) => i !== indice);
  });
}

/** Análogo a `mutarConceptosManuales` pero sobre el array `horasExtra` del snapshot. */
async function mutarHorasExtra(
  liquidacionId: string,
  mutar: (actuales: HoraExtraGuardada[]) => HoraExtraGuardada[] | { error: string },
): Promise<ActionResult> {
  try {
    const liquidacion = await db.liquidacionMensual.findUniqueOrThrow({
      where: { id: liquidacionId },
      include: { periodo: true },
    });
    const session = await requireEscritura(liquidacion.periodo.empresaId);
    if (liquidacion.periodo.estado !== "BORRADOR") {
      return { ok: false, error: "El período ya fue confirmado, no se pueden modificar horas extra." };
    }

    const snap = liquidacion.snapshotInputJson as {
      conceptosManuales?: ConceptoManualGuardado[];
      horasExtra?: HoraExtraGuardada[];
    };
    const resultado = mutar(snap?.horasExtra ?? []);
    if (!Array.isArray(resultado)) return { ok: false, error: resultado.error };

    await calcularYGuardarLiquidacionLegajo({
      periodoId: liquidacion.periodoId,
      empresaId: liquidacion.periodo.empresaId,
      anio: liquidacion.periodo.anio,
      mes: liquidacion.periodo.mes,
      legajoId: liquidacion.legajoId,
      usuarioId: session.user.id,
      conceptosManuales: snap?.conceptosManuales ?? [],
      horasExtra: resultado,
    });

    revalidatePath(`/empresas/${liquidacion.periodo.empresaId}/liquidaciones/${liquidacion.periodoId}`);
    revalidatePath(
      `/empresas/${liquidacion.periodo.empresaId}/liquidaciones/${liquidacion.periodoId}/${liquidacionId}`,
    );
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al guardar las horas extra." };
  }
}

function parseHoraExtra(entrada: unknown): HoraExtraGuardada | { error: string } {
  const parsed = horaExtraSchema.safeParse(entrada);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  return {
    horas: String(parsed.data.horas),
    recargo: parsed.data.recargo,
    modalidad: parsed.data.modalidad,
  };
}

export async function agregarHorasExtra(
  liquidacionId: string,
  entrada: unknown,
): Promise<ActionResult> {
  const he = parseHoraExtra(entrada);
  if ("error" in he) return { ok: false, error: he.error };
  return await mutarHorasExtra(liquidacionId, (actuales) => [...actuales, he]);
}

export async function editarHorasExtra(
  liquidacionId: string,
  indice: number,
  entrada: unknown,
): Promise<ActionResult> {
  const he = parseHoraExtra(entrada);
  if ("error" in he) return { ok: false, error: he.error };
  return await mutarHorasExtra(liquidacionId, (actuales) => {
    if (indice < 0 || indice >= actuales.length) return { error: "Registro no encontrado." };
    return actuales.map((h, i) => (i === indice ? he : h));
  });
}

export async function eliminarHorasExtra(
  liquidacionId: string,
  indice: number,
): Promise<ActionResult> {
  return await mutarHorasExtra(liquidacionId, (actuales) => {
    if (indice < 0 || indice >= actuales.length) return { error: "Registro no encontrado." };
    return actuales.filter((_, i) => i !== indice);
  });
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
