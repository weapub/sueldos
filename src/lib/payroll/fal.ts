import { type Money, ZERO, round2, max as moneyMax, min as moneyMin } from "./money";

export type TamanoEmpresaFal = "PYME" | "GRANDE";

/** Título II, Ley 27.802: contribución mensual del empleador al Fondo de Asistencia Laboral. */
export function calcularContribucionMensualFAL(
  baseImponibleTotalPeriodo: Money,
  tamano: TamanoEmpresaFal,
  tasas: { falGrande: Money; falPyme: Money },
): Money {
  const tasa = tamano === "GRANDE" ? tasas.falGrande : tasas.falPyme;
  return round2(baseImponibleTotalPeriodo.times(tasa));
}

export interface CoberturaFalResult {
  cumpleCarencia: boolean;
  cumpleAntiguedadMinima: boolean;
  montoCubiertoPorFondo: Money;
  montoACargoEmpleador: Money;
}

const MESES_CARENCIA = 6;
const MESES_ANTIGUEDAD_MINIMA = 12;

function agregarMeses(fecha: Date, meses: number): Date {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + meses, fecha.getUTCDate()));
}

function mesesEntre(desde: Date, hasta: Date): number {
  return (
    (hasta.getUTCFullYear() - desde.getUTCFullYear()) * 12 + (hasta.getUTCMonth() - desde.getUTCMonth())
  );
}

/**
 * Evalúa si el Fondo de Asistencia Laboral puede cubrir (total o parcialmente) el costo de
 * una desvinculación: requiere 6 meses de carencia desde el alta del fondo en la empresa y
 * que el legajo tenga al menos 12 meses de antigüedad. El empleador sigue siendo responsable
 * por cualquier excedente si el fondo no cubre el monto completo.
 */
export function evaluarCoberturaFal(params: {
  fal: { fechaAlta: Date; saldoActual: Money };
  legajo: { fechaIngreso: Date };
  fechaEgreso: Date;
  montoSolicitado: Money;
}): CoberturaFalResult {
  const cumpleCarencia = params.fechaEgreso >= agregarMeses(params.fal.fechaAlta, MESES_CARENCIA);
  const cumpleAntiguedadMinima =
    mesesEntre(params.legajo.fechaIngreso, params.fechaEgreso) >= MESES_ANTIGUEDAD_MINIMA;

  if (!cumpleCarencia || !cumpleAntiguedadMinima) {
    return {
      cumpleCarencia,
      cumpleAntiguedadMinima,
      montoCubiertoPorFondo: ZERO,
      montoACargoEmpleador: params.montoSolicitado,
    };
  }

  const montoCubiertoPorFondo = moneyMin(moneyMax(params.fal.saldoActual, ZERO), params.montoSolicitado);
  const montoACargoEmpleador = round2(params.montoSolicitado.minus(montoCubiertoPorFondo));

  return { cumpleCarencia, cumpleAntiguedadMinima, montoCubiertoPorFondo, montoACargoEmpleador };
}
