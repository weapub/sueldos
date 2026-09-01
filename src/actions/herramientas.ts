"use server";

import { db } from "@/lib/db";
import { requireEmpresaAccess, AuthzError } from "@/lib/authz";
import { getTasasVigentes } from "@/lib/tasas";
import { calcularLiquidacionMensual } from "@/lib/payroll/mensual";
import { money } from "@/lib/payroll/money";
import type { ActionResult } from "@/actions/empresas";

export type NetoBrutoResultado = {
  sueldoBasico: string;
  totalRemunerativo: string;
  totalNoRemunerativo: string;
  totalDeducciones: string;
  neto: string;
  conceptos: { descripcion: string; monto: string; esDeduccion: boolean; porcentaje: string | null }[];
};

/**
 * Resuelve el sueldo básico que produce un neto objetivo, iterando el motor de liquidación
 * (búsqueda binaria; el neto es monótono creciente en el básico).
 */
export async function resolverBrutoDesdeNeto(
  empresaId: string,
  input: {
    categoriaId: string;
    netoObjetivo: number;
    diasTrabajados: number;
    antiguedadAnios: number;
    afiliadoSindical: boolean;
  },
): Promise<ActionResult<NetoBrutoResultado>> {
  try {
    await requireEmpresaAccess(empresaId);
    if (!(input.netoObjetivo > 0)) return { ok: false, error: "Ingresá un neto objetivo mayor a 0." };

    const categoria = await db.categoriaConvenio.findFirst({
      where: { id: input.categoriaId, empresaId },
    });
    if (!categoria) return { ok: false, error: "Categoría no encontrada." };

    const ahora = new Date();
    const anio = ahora.getUTCFullYear();
    const mes = ahora.getUTCMonth() + 1;
    const diasEnMes = new Date(anio, mes, 0).getDate();
    const tasas = await getTasasVigentes(empresaId, new Date(anio, mes - 1, 1));
    const noRem = money(categoria.remuneracionNoRemunerativa.toString());

    const calcularNeto = (basico: number) =>
      calcularLiquidacionMensual({
        legajo: {
          sueldoBasico: money(basico),
          horasSemanalesFullTime: money(48),
          modalidadRemuneracion: "MENSUAL",
          antiguedadAnios: input.antiguedadAnios,
          remuneracionNoRemunerativa: noRem.gt(0) ? noRem : undefined,
          afiliadoSindical: input.afiliadoSindical,
        },
        anio,
        mes,
        diasTrabajados: input.diasTrabajados,
        diasEnMes,
        esMesSAC: false,
        conceptos: [],
        tasas,
      });

    let lo = 0;
    let hi = Math.max(input.netoObjetivo * 3, 1000);
    // Asegurar que hi produce un neto >= objetivo.
    for (let i = 0; i < 20 && Number(calcularNeto(hi).neto.toString()) < input.netoObjetivo; i++) {
      hi *= 2;
    }
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      const n = Number(calcularNeto(mid).neto.toString());
      if (Math.abs(n - input.netoObjetivo) < 0.5) {
        lo = mid;
        break;
      }
      if (n < input.netoObjetivo) lo = mid;
      else hi = mid;
    }
    const basicoFinal = Math.round(((lo + hi) / 2) * 100) / 100;
    const r = calcularNeto(basicoFinal);

    return {
      ok: true,
      data: {
        sueldoBasico: basicoFinal.toFixed(2),
        totalRemunerativo: r.totalRemunerativo.toString(),
        totalNoRemunerativo: r.totalNoRemunerativo.toString(),
        totalDeducciones: r.totalDeducciones.toString(),
        neto: r.neto.toString(),
        conceptos: r.conceptos
          .filter((c) => c.tipo !== "CONTRIBUCION_PATRONAL")
          .map((c) => ({
            descripcion: c.nombre,
            monto: c.montoAjustado.toString(),
            esDeduccion: c.tipo === "DEDUCCION",
            porcentaje: c.porcentaje ? c.porcentaje.toString() : null,
          })),
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al calcular el bruto." };
  }
}
