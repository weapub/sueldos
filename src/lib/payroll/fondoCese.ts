import { type Money, round2 } from "./money";

/**
 * Fondo de Cese Laboral (Ley 22.250, UOCRA): el empleador deposita mensualmente, por
 * trabajador, en una cuenta individual a su nombre en el IERIC — 12% de la remuneración
 * durante el primer año de antigüedad, 8% desde el segundo. Reemplaza por completo el
 * preaviso e indemnización art. 245 LCT para este convenio; no hay tope ni piso de garantía
 * como en Comercio, es simplemente el saldo acumulado de la cuenta.
 */
export function calcularDepositoMensualFCL(
  baseImponiblePeriodo: Money,
  antiguedadAniosAlCierreDePeriodo: number,
  tasas: { fondoCeseTasaPrimerAnio: Money; fondoCeseTasaDesdeSegundoAnio: Money },
): Money {
  const tasa =
    antiguedadAniosAlCierreDePeriodo < 1 ? tasas.fondoCeseTasaPrimerAnio : tasas.fondoCeseTasaDesdeSegundoAnio;
  return round2(baseImponiblePeriodo.times(tasa));
}
