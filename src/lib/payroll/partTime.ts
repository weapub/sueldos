import { Decimal } from "decimal.js";
import { type Money, money, round2 } from "./money";

/**
 * Art. 92 ter LCT: la remuneración del trabajador part-time no puede ser
 * proporcionalmente menor a la de un full-time de igual categoría.
 * El motor aplica la proporción exacta (nunca menos).
 */
export function calcularSueldoProporcional(
  sueldoBasicoFullTime: Money,
  horasContratadas: Money,
  horasFullTime: Money,
): Money {
  if (horasFullTime.lte(0)) {
    throw new Error("horasFullTime debe ser mayor a 0.");
  }
  const proporcion = horasContratadas.div(horasFullTime);
  return round2(sueldoBasicoFullTime.times(proporcion));
}

export function esPartTime(horasContratadas: Money | undefined, horasFullTime: Money): boolean {
  if (!horasContratadas) return false;
  return horasContratadas.lt(horasFullTime);
}

/**
 * Horas trabajadas por encima de las contratadas son "horas suplementarias" voluntarias
 * (no horas extra legales) y no pueden exceder el máximo legal diario/semanal de la categoría.
 */
export function validarHorasSuplementariasPartTime(
  horasTrabajadas: Money,
  horasContratadas: Money,
  topeLegalSemanal: Money,
): { horasSuplementarias: Money; excedeTopeLegal: boolean } {
  const horasSuplementarias = Decimal.max(horasTrabajadas.minus(horasContratadas), money(0));
  return {
    horasSuplementarias,
    excedeTopeLegal: horasTrabajadas.gt(topeLegalSemanal),
  };
}
