import { type Money, round2 } from "./money";

/** SAC = mejor remuneración mensual del semestre / 2. */
export function calcularSAC(mejorRemuneracionSemestre: Money): Money {
  return round2(mejorRemuneracionSemestre.div(2));
}

/** SAC proporcional cuando no se trabajó el semestre completo (ingreso/egreso a mitad de semestre). */
export function calcularSACProporcional(
  mejorRemuneracionSemestre: Money,
  diasTrabajadosEnSemestre: number,
  diasSemestre: number,
): Money {
  if (diasSemestre <= 0) throw new Error("diasSemestre debe ser mayor a 0.");
  const sacCompleto = calcularSAC(mejorRemuneracionSemestre);
  return round2(sacCompleto.times(diasTrabajadosEnSemestre).div(diasSemestre));
}
