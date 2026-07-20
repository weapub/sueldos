import { type Money, round2 } from "./money";

/** Tramos de antigüedad LCT art. 154. */
export function diasVacacionesPorAntiguedad(fechaIngreso: Date, fechaCalculo: Date): number {
  const antiguedadAnios = antiguedadEnAnios(fechaIngreso, fechaCalculo);
  if (antiguedadAnios < 5) return 14;
  if (antiguedadAnios < 10) return 21;
  if (antiguedadAnios < 20) return 28;
  return 35;
}

// Getters UTC: las fechas de legajo son fechas-calendario ("YYYY-MM-DD" -> medianoche UTC);
// usar getters locales desfasaría el cálculo un día según el huso horario del servidor.
/** Años de antigüedad completos a una fecha de referencia (no confundir con el redondeo del art. 245). */
export function antiguedadEnAnios(fechaIngreso: Date, fechaCalculo: Date): number {
  let anios = fechaCalculo.getUTCFullYear() - fechaIngreso.getUTCFullYear();
  const aniversarioEsteAnio = new Date(
    Date.UTC(fechaCalculo.getUTCFullYear(), fechaIngreso.getUTCMonth(), fechaIngreso.getUTCDate()),
  );
  if (fechaCalculo < aniversarioEsteAnio) anios -= 1;
  return Math.max(anios, 0);
}

/** Vacaciones proporcionales al egreso: 1 día de vacaciones cada 20 días trabajados en el año. */
export function calcularVacacionesProporcionales(
  fechaIngreso: Date,
  fechaEgreso: Date,
  mejorSueldoDiario: Money,
): { dias: number; monto: Money } {
  const inicioAnio = new Date(Date.UTC(fechaEgreso.getUTCFullYear(), 0, 1));
  const desde = fechaIngreso > inicioAnio ? fechaIngreso : inicioAnio;
  const diasTrabajadosEnAnio = Math.max(diffDias(desde, fechaEgreso) + 1, 0);
  const diasCorrespondenTotales = diasVacacionesPorAntiguedad(fechaIngreso, fechaEgreso);
  const dias = Math.floor((diasCorrespondenTotales * diasTrabajadosEnAnio) / 365);
  return { dias, monto: round2(mejorSueldoDiario.times(dias)) };
}

function diffDias(desde: Date, hasta: Date): number {
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.round((hasta.getTime() - desde.getTime()) / msPorDia);
}
