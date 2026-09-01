import type { TipoLicencia } from "@/generated/prisma/enums";

export interface LicenciaInput {
  tipo: TipoLicencia;
  desde: Date;
  hasta: Date;
  conGoce: boolean;
}

export interface DiasLicenciasResult {
  diasNoPagados: number;
  detalle: { tipo: TipoLicencia; diasEnMes: number; diasNoPagados: number }[];
  warnings: string[];
}

const MS_DIA = 86_400_000;

/** Días corridos entre dos fechas UTC, ambos extremos incluidos. */
function diasInclusive(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / MS_DIA) + 1;
}

const LABEL: Record<TipoLicencia, string> = {
  ENFERMEDAD_INCULPABLE: "enfermedad (art. 208)",
  ACCIDENTE_TRABAJO: "accidente de trabajo (ART)",
  MATERNIDAD: "maternidad",
  LICENCIA_ESPECIAL: "licencia especial",
  SUSPENSION: "suspensión",
  SIN_GOCE: "sin goce de haberes",
  OTRA: "licencia",
};

/**
 * Días del mes que NO se pagan por licencias. La liquidación resta este número al prorrateo
 * del básico. Reglas:
 * - `conGoce = false` (maternidad, suspensión sin goce, permiso sin goce) → todos los días
 *   de la licencia dentro del mes no se pagan.
 * - `ACCIDENTE_TRABAJO` → los primeros 10 días corridos de la licencia los paga el empleador;
 *   del día 11 en adelante la prestación dineraria la paga la ART, no se paga acá.
 * - resto con goce (enfermedad art. 208 dentro del plazo, licencias especiales) → se pagan.
 *
 * Nota: si dos licencias se solapan en los mismos días, se cuentan por separado — cargar
 * períodos disjuntos.
 */
export function calcularDiasNoPagadosPorLicencias(
  licencias: LicenciaInput[],
  anio: number,
  mes: number,
): DiasLicenciasResult {
  const warnings: string[] = [];
  const detalle: DiasLicenciasResult["detalle"] = [];
  const inicioMes = new Date(Date.UTC(anio, mes - 1, 1));
  const finMes = new Date(Date.UTC(anio, mes, 0));
  let total = 0;

  for (const l of licencias) {
    const ini = l.desde > inicioMes ? l.desde : inicioMes;
    const fin = l.hasta < finMes ? l.hasta : finMes;
    if (fin < ini) continue; // no se solapa con el mes
    const diasEnMes = diasInclusive(ini, fin);

    let noPagados = 0;
    if (l.tipo === "ACCIDENTE_TRABAJO") {
      const previos =
        l.desde < inicioMes ? diasInclusive(l.desde, new Date(inicioMes.getTime() - MS_DIA)) : 0;
      const pagadosEnMes = Math.min(Math.max(0, 10 - previos), diasEnMes);
      noPagados = diasEnMes - pagadosEnMes;
    } else if (!l.conGoce) {
      noPagados = diasEnMes;
    }

    if (noPagados > 0) {
      total += noPagados;
      warnings.push(`Licencia por ${LABEL[l.tipo]}: ${noPagados} día/s no pagado/s en el período.`);
    }
    detalle.push({ tipo: l.tipo, diasEnMes, diasNoPagados: noPagados });
  }

  return { diasNoPagados: total, detalle, warnings };
}
