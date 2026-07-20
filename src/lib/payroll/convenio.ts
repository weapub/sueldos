import { type Money, round2 } from "./money";

/**
 * Antigüedad por convenio: `base × años × tasa` (ej. CCT 130/75 Comercio: 1% por año).
 * `base` es la remuneración YA prorrateada por horas/días del período (no la de escala completa).
 */
export function calcularAntiguedadImporte(base: Money, antiguedadAnios: number, tasaPorAnio: Money): Money {
  return round2(base.times(antiguedadAnios).times(tasaPorAnio));
}

/**
 * Divisor estándar de presentismo (1/12 del período, equivalente a un mes adicional por año
 * trabajado sin inasistencias). Es una convención LCT/CCT muy extendida, no un valor legal
 * fijo — por eso se puede sobreescribir, pero rara vez cambia.
 */
export const PRESENTISMO_DIVISOR_DEFAULT = 12;

/**
 * Presentismo = (base + antigüedad) / divisor. Se usa un divisor entero en vez de una tasa
 * porcentual para evitar el error de redondeo de guardar 1/12 como decimal fraccionario
 * (0.08333 en vez de 0.08333...33) — a montos grandes esa diferencia deja de ser despreciable.
 */
export function calcularPresentismo(
  base: Money,
  antiguedad: Money,
  divisor: number = PRESENTISMO_DIVISOR_DEFAULT,
): Money {
  return round2(base.plus(antiguedad).div(divisor));
}
