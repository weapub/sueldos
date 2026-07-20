import { Decimal } from "decimal.js";
import { type Money, ZERO, money, round2, sum, max as moneyMax, min as moneyMin } from "./money";

export type MotivoDesvinculacion =
  | "DESPIDO_SIN_CAUSA"
  | "DESPIDO_CON_CAUSA"
  | "RENUNCIA"
  | "MUTUO_ACUERDO"
  | "FALLECIMIENTO"
  | "VENCIMIENTO_CONTRATO";

export type VinculoBeneficiario = "CONYUGE_CONVIVIENTE" | "HIJO_MENOR" | "HIJO_DISCAPACITADO" | "PADRE_MADRE";

/**
 * Meses completos transcurridos entre dos fechas (para antigüedad y preaviso).
 * Usa getters UTC porque las fechas de legajo son fechas-calendario (sin hora):
 * `new Date("YYYY-MM-DD")` parsea como medianoche UTC, y usar getters locales
 * desfasaría el cálculo un día según el huso horario del servidor.
 */
export function mesesCompletos(desde: Date, hasta: Date): number {
  let meses = (hasta.getUTCFullYear() - desde.getUTCFullYear()) * 12 + (hasta.getUTCMonth() - desde.getUTCMonth());
  if (hasta.getUTCDate() < desde.getUTCDate()) meses -= 1;
  return Math.max(meses, 0);
}

/** Art. 245: 1 año por cada 12 meses completos; fracción > 3 meses redondea al año siguiente. */
export function calcularAntiguedadAnios(fechaIngreso: Date, fechaEgreso: Date): number {
  const meses = mesesCompletos(fechaIngreso, fechaEgreso);
  const anios = Math.floor(meses / 12);
  const mesesRestantes = meses % 12;
  return anios + (mesesRestantes > 3 ? 1 : 0);
}

export interface BaseArt245Input {
  /** Remuneración fija habitual actual (excluye SAC, vacaciones, no remunerativos). */
  remuneracionFijaHabitual: Money;
  /** Montos mensuales de conceptos variables/habituales, ordenados de más antiguo a más reciente (hasta 12). */
  remuneracionesVariablesUltimos12Meses: Money[];
}

/**
 * Base del art. 245: remunerativo fijo + el mayor entre el promedio de los últimos 6 meses
 * y el promedio de los últimos 12 meses de los conceptos variables (lo más favorable al trabajador).
 */
export function calcularBaseArt245(input: BaseArt245Input): Money {
  const variables = input.remuneracionesVariablesUltimos12Meses;
  if (variables.length === 0) return round2(input.remuneracionFijaHabitual);

  const ultimos6 = variables.slice(-6);
  const promedio6 = sum(ultimos6).div(ultimos6.length);
  const promedio12 = sum(variables).div(variables.length);
  const mejorPromedioVariable = moneyMax(promedio6, promedio12);

  return round2(input.remuneracionFijaHabitual.plus(mejorPromedioVariable));
}

export interface Art245Result {
  baseArt245: Money;
  antiguedadAnios: number;
  indemnizacionSinTope: Money;
  topeConvenio: Money;
  indemnizacionConTope: Money;
  pisoGarantia67: Money;
  pisoUnMes: Money;
  indemnizacionFinal: Money;
}

/**
 * Indemnización por antigüedad (art. 245) con el tope de 3x el salario de convenio y la
 * garantía de piso del 67% introducidos por la Ley 27.802. Orden de aplicación:
 * 1) monto sin tope, 2) aplicar tope de convenio, 3) el resultado nunca puede ser menor al
 * 67% del monto sin tope, ni menor a 1 mes de la base art. 245.
 */
export function calcularIndemnizacionArt245(params: {
  base: BaseArt245Input;
  fechaIngreso: Date;
  fechaEgreso: Date;
  salarioBaseConvenio: Money;
}): Art245Result {
  const baseArt245 = calcularBaseArt245(params.base);
  const antiguedadAnios = calcularAntiguedadAnios(params.fechaIngreso, params.fechaEgreso);

  const indemnizacionSinTope = round2(baseArt245.times(antiguedadAnios));
  const topeConvenio = round2(params.salarioBaseConvenio.times(3));
  const indemnizacionConTope = moneyMin(indemnizacionSinTope, topeConvenio);
  const pisoGarantia67 = round2(indemnizacionSinTope.times(0.67));
  const pisoUnMes = baseArt245;
  const indemnizacionFinal = moneyMax(indemnizacionConTope, pisoGarantia67, pisoUnMes);

  return {
    baseArt245,
    antiguedadAnios,
    indemnizacionSinTope,
    topeConvenio,
    indemnizacionConTope,
    pisoGarantia67,
    pisoUnMes,
    indemnizacionFinal,
  };
}

/**
 * Art. 231: preaviso de 1 mes (antigüedad <= 5 años) o 2 meses (> 5 años), no exigible
 * durante el período de prueba. Si el empleador ya otorgó el preaviso trabajado, no
 * corresponde indemnización sustitutiva.
 */
export function calcularPreaviso(params: {
  antiguedadAnios: number;
  enPeriodoDePrueba: boolean;
  preavisoOtorgado: boolean;
  baseArt245: Money;
}): { mesesPreaviso: number; montoPreaviso: Money } {
  if (params.enPeriodoDePrueba || params.preavisoOtorgado) {
    return { mesesPreaviso: 0, montoPreaviso: ZERO };
  }
  const mesesPreaviso = params.antiguedadAnios > 5 ? 2 : 1;
  return { mesesPreaviso, montoPreaviso: round2(params.baseArt245.times(mesesPreaviso)) };
}

/**
 * Art. 255 (reingreso): se descuenta de la indemnización por antigüedad completa el monto
 * de la indemnización anterior ya percibida (indexado por IPC), pero el resultado nunca
 * puede ser menor al que correspondería considerando solo el último período de empleo.
 */
export function calcularAjusteReingreso(params: {
  indemnizacionAntiguedadCompleta: Money;
  montoIndemnizacionAnteriorPagada: Money;
  ipcAcumulado: Decimal.Value;
  indemnizacionSoloUltimoPeriodo: Money;
}): Money {
  const montoIndexado = round2(params.montoIndemnizacionAnteriorPagada.times(params.ipcAcumulado));
  const diferencia = params.indemnizacionAntiguedadCompleta.minus(montoIndexado);
  return moneyMax(diferencia, params.indemnizacionSoloUltimoPeriodo);
}

const TIER1_VINCULOS: VinculoBeneficiario[] = ["CONYUGE_CONVIVIENTE", "HIJO_MENOR", "HIJO_DISCAPACITADO"];

export interface Beneficiario {
  nombre: string;
  vinculo: VinculoBeneficiario;
}

export interface BeneficiarioAsignado extends Beneficiario {
  montoAsignado: Money;
}

/**
 * Art. 248 (fallecimiento): cónyuge/conviviente e hijos (menores o con discapacidad) tienen
 * prioridad como grupo y se reparten el monto en partes iguales; los padres solo heredan si
 * no hay beneficiarios de ese primer grupo.
 *
 * NOTA (supuesto a validar): se distribuye el monto pleno del art. 245. El régimen LCT
 * clásico remite al art. 247 (mitad del monto) en fallecimiento — revisar el texto completo
 * de la Ley 27.802 antes de usar este cálculo en un caso real.
 */
export function calcularDistribucionFallecimiento(
  montoTotal: Money,
  beneficiarios: Beneficiario[],
): BeneficiarioAsignado[] {
  const tier1 = beneficiarios.filter((b) => TIER1_VINCULOS.includes(b.vinculo));
  const grupo = tier1.length > 0 ? tier1 : beneficiarios.filter((b) => b.vinculo === "PADRE_MADRE");
  if (grupo.length === 0) return [];

  const montoBase = round2(montoTotal.div(grupo.length));
  const asignados = grupo.map((b) => ({ ...b, montoAsignado: montoBase }));

  // Ajusta el redondeo en el último beneficiario para que la suma cierre exacto.
  const totalAsignado = sum(asignados.map((a) => a.montoAsignado));
  const diferencia = montoTotal.minus(totalAsignado);
  if (!diferencia.eq(0) && asignados.length > 0) {
    asignados[asignados.length - 1].montoAsignado = round2(
      asignados[asignados.length - 1].montoAsignado.plus(diferencia),
    );
  }

  return asignados;
}

export interface IndemnizacionInput {
  motivo: MotivoDesvinculacion;
  fechaIngreso: Date;
  fechaEgreso: Date;
  enPeriodoDePrueba: boolean;
  preavisoOtorgado: boolean;
  base: BaseArt245Input;
  salarioBaseConvenio: Money;
  reingreso?: {
    fechaIngresoOriginal: Date;
    baseOriginal: BaseArt245Input;
    montoIndemnizacionAnteriorPagada: Money;
    ipcAcumulado: Decimal.Value;
  };
  fallecimiento?: { beneficiarios: Beneficiario[] };
}

export interface IndemnizacionResult {
  art245: Art245Result;
  preaviso: { mesesPreaviso: number; montoPreaviso: Money };
  ajusteReingresoAplicado: boolean;
  montoIndemnizacionAntiguedad: Money;
  beneficiariosFallecimiento?: BeneficiarioAsignado[];
  montoTotal: Money;
  warnings: string[];
}

/**
 * Orquestador del módulo de desvinculaciones. Función pura: no accede a la base de datos.
 * El llamador resuelve legajo/categoría/histórico y mapea a este input.
 */
export function calcularIndemnizacion(input: IndemnizacionInput): IndemnizacionResult {
  const warnings: string[] = [];
  const art245 = calcularIndemnizacionArt245({
    base: input.base,
    fechaIngreso: input.fechaIngreso,
    fechaEgreso: input.fechaEgreso,
    salarioBaseConvenio: input.salarioBaseConvenio,
  });

  const corresponeIndemnizacionAntiguedad =
    input.motivo === "DESPIDO_SIN_CAUSA" || input.motivo === "FALLECIMIENTO" || input.motivo === "VENCIMIENTO_CONTRATO";

  let montoIndemnizacionAntiguedad = corresponeIndemnizacionAntiguedad ? art245.indemnizacionFinal : ZERO;
  let ajusteReingresoAplicado = false;

  if (corresponeIndemnizacionAntiguedad && input.reingreso) {
    const art245UltimoPeriodo = calcularIndemnizacionArt245({
      base: input.base,
      fechaIngreso: input.reingreso.fechaIngresoOriginal,
      fechaEgreso: input.fechaEgreso,
      salarioBaseConvenio: input.salarioBaseConvenio,
    });
    const art245AntiguedadCompleta = calcularIndemnizacionArt245({
      base: input.reingreso.baseOriginal,
      fechaIngreso: input.fechaIngreso,
      fechaEgreso: input.fechaEgreso,
      salarioBaseConvenio: input.salarioBaseConvenio,
    });
    montoIndemnizacionAntiguedad = calcularAjusteReingreso({
      indemnizacionAntiguedadCompleta: art245AntiguedadCompleta.indemnizacionFinal,
      montoIndemnizacionAnteriorPagada: input.reingreso.montoIndemnizacionAnteriorPagada,
      ipcAcumulado: input.reingreso.ipcAcumulado,
      indemnizacionSoloUltimoPeriodo: art245UltimoPeriodo.indemnizacionFinal,
    });
    ajusteReingresoAplicado = true;
  }

  const preaviso =
    input.motivo === "DESPIDO_SIN_CAUSA"
      ? calcularPreaviso({
          antiguedadAnios: art245.antiguedadAnios,
          enPeriodoDePrueba: input.enPeriodoDePrueba,
          preavisoOtorgado: input.preavisoOtorgado,
          baseArt245: art245.baseArt245,
        })
      : { mesesPreaviso: 0, montoPreaviso: ZERO };

  let beneficiariosFallecimiento: BeneficiarioAsignado[] | undefined;
  if (input.motivo === "FALLECIMIENTO") {
    warnings.push(
      "Fallecimiento: se distribuyó el monto pleno del art. 245 (art. 248). Verificar contra el texto completo de la Ley 27.802 si corresponde reducirlo a la mitad (régimen del art. 247).",
    );
    beneficiariosFallecimiento = calcularDistribucionFallecimiento(
      montoIndemnizacionAntiguedad,
      input.fallecimiento?.beneficiarios ?? [],
    );
    if (beneficiariosFallecimiento.length === 0) {
      warnings.push("No se informaron beneficiarios válidos para la distribución del art. 248.");
    }
  }

  if (input.motivo === "VENCIMIENTO_CONTRATO") {
    warnings.push(
      "Vencimiento de contrato a plazo fijo: se aplicó la misma fórmula del art. 245 como simplificación. Revisar el art. 250 (indemnización reducida a la mitad si el contrato duró menos de 1 año) antes de confirmar.",
    );
  }

  const montoTotal = round2(montoIndemnizacionAntiguedad.plus(preaviso.montoPreaviso));

  return {
    art245,
    preaviso,
    ajusteReingresoAplicado,
    montoIndemnizacionAntiguedad,
    beneficiariosFallecimiento,
    montoTotal,
    warnings,
  };
}

export { money };
