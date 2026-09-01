import { type Money, ZERO, round2 } from "./money";
import { calcularSACProporcional } from "./sac";
import { calcularVacacionesProporcionales } from "./vacaciones";
import type { MotivoDesvinculacion } from "./indemnizacion";

const MS_DIA = 86_400_000;

/** Getters UTC: las fechas de legajo son fechas-calendario (medianoche UTC). */
function diasEntre(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_DIA);
}
function diasDelMes(anio: number, mesIndex0: number): number {
  return new Date(Date.UTC(anio, mesIndex0 + 1, 0)).getUTCDate();
}

export interface LiquidacionFinalInput {
  fechaIngreso: Date;
  fechaEgreso: Date;
  motivo: MotivoDesvinculacion;
  preavisoOtorgado: boolean;
  /** Remuneración mensual habitual (última liquidación o básico + adicionales). Base de días trabajados e integración. */
  remuneracionMensual: Money;
  /** Mejor remuneración del semestre en curso — base del SAC proporcional. */
  mejorRemuneracionSemestre: Money;
  /** Días de vacaciones del año de egreso ya gozados (se restan de las proporcionales). */
  diasVacacionesGozadas?: number;
  /** Monto de la indemnización sustitutiva de preaviso (art. 232), para el SAC sobre preaviso. */
  montoPreaviso?: Money;
}

export interface LiquidacionFinalResult {
  diasTrabajadosMes: { dias: number; monto: Money };
  sacProporcional: Money;
  vacacionesNoGozadas: { dias: number; monto: Money };
  integracionMesDespido: Money;
  sacSobreIntegracion: Money;
  sacSobrePreaviso: Money;
  subtotalFinal: Money;
  warnings: string[];
}

/**
 * Rubros de la liquidación final por egreso (además de la indemnización art. 245/232):
 * días trabajados del mes de egreso, SAC proporcional del semestre, vacaciones no gozadas
 * proporcionales (art. 155 = sueldo / 25), integración del mes de despido (art. 233, solo
 * despido sin causa y si el egreso no es a fin de mes) y SAC sobre integración/preaviso.
 */
export function calcularLiquidacionFinal(input: LiquidacionFinalInput): LiquidacionFinalResult {
  const warnings: string[] = [];
  const eg = input.fechaEgreso;
  const anio = eg.getUTCFullYear();
  const mes0 = eg.getUTCMonth();
  const diasMes = diasDelMes(anio, mes0);
  const diaEgreso = eg.getUTCDate();

  // Días trabajados del mes de egreso.
  const dtMonto = round2(input.remuneracionMensual.times(diaEgreso).div(diasMes));

  // SAC proporcional del semestre en curso.
  const primerSemestre = mes0 <= 5;
  const inicioSem = new Date(Date.UTC(anio, primerSemestre ? 0 : 6, 1));
  const finSem = new Date(Date.UTC(anio, primerSemestre ? 5 : 11, primerSemestre ? 30 : 31));
  const diasSemestre = diasEntre(inicioSem, finSem) + 1;
  const desdeSem = input.fechaIngreso > inicioSem ? input.fechaIngreso : inicioSem;
  const diasTrabSem = Math.min(Math.max(diasEntre(desdeSem, eg) + 1, 0), diasSemestre);
  const sacProporcional = calcularSACProporcional(
    input.mejorRemuneracionSemestre,
    diasTrabSem,
    diasSemestre,
  );

  // Vacaciones no gozadas proporcionales (art. 155: valor día = sueldo / 25).
  const sueldoDiarioVac = round2(input.remuneracionMensual.div(25));
  const vac = calcularVacacionesProporcionales(input.fechaIngreso, eg, sueldoDiarioVac);
  const gozadas = input.diasVacacionesGozadas ?? 0;
  const vacDias = Math.max(vac.dias - gozadas, 0);
  const vacMonto = round2(sueldoDiarioVac.times(vacDias));
  if (gozadas === 0) {
    warnings.push(
      "Vacaciones proporcionales calculadas sin restar días ya gozados en el año — verificar el registro de vacaciones.",
    );
  }

  // Integración del mes de despido (art. 233): solo despido sin causa y si no es a fin de mes.
  const aplicaIntegracion = input.motivo === "DESPIDO_SIN_CAUSA" && diaEgreso < diasMes;
  const integracionMesDespido = aplicaIntegracion
    ? round2(input.remuneracionMensual.times(diasMes - diaEgreso).div(diasMes))
    : ZERO;
  const sacSobreIntegracion = aplicaIntegracion ? round2(integracionMesDespido.div(12)) : ZERO;

  // SAC sobre preaviso: solo si el preaviso se indemniza (no fue otorgado/trabajado).
  const sacSobrePreaviso =
    !input.preavisoOtorgado && input.montoPreaviso && input.montoPreaviso.gt(0)
      ? round2(input.montoPreaviso.div(12))
      : ZERO;

  const subtotalFinal = dtMonto
    .plus(sacProporcional)
    .plus(vacMonto)
    .plus(integracionMesDespido)
    .plus(sacSobreIntegracion)
    .plus(sacSobrePreaviso);

  return {
    diasTrabajadosMes: { dias: diaEgreso, monto: dtMonto },
    sacProporcional,
    vacacionesNoGozadas: { dias: vacDias, monto: vacMonto },
    integracionMesDespido,
    sacSobreIntegracion,
    sacSobrePreaviso,
    subtotalFinal,
    warnings,
  };
}
