import { type Money, round2 } from "./money";

export type ModalidadCompensacion = "PAGO" | "BANCO_HORAS" | "FRANCO_COMPENSATORIO";

/**
 * Art. 197 bis: las horas extra pueden compensarse en dinero, banco de horas o
 * franco compensatorio, según acuerdo escrito. `valorHora` ya debe incluir el
 * recargo legal correspondiente (50%/100%) cuando `modalidad = "PAGO"`.
 */
export function calcularHorasExtra(
  horasExtra: Money,
  valorHora: Money,
  modalidad: ModalidadCompensacion,
): { montoAPagar: Money; horasAcreditadasBanco: Money } {
  if (modalidad === "PAGO") {
    return { montoAPagar: round2(horasExtra.times(valorHora)), horasAcreditadasBanco: horasExtra.mul(0) };
  }
  // Banco de horas y franco compensatorio no generan pago en efectivo en el período.
  return { montoAPagar: horasExtra.mul(0), horasAcreditadasBanco: horasExtra };
}

/** Descanso mínimo legal: 12hs entre turnos, 35hs de descanso semanal (art. 197 bis). */
export function validarDescansoMinimo(
  horasEntreTurnos: number,
  horasDescansoSemanal: number,
): { cumple: boolean; motivo?: string } {
  if (horasEntreTurnos < 12) {
    return { cumple: false, motivo: "El descanso entre turnos es menor a las 12 horas mínimas." };
  }
  if (horasDescansoSemanal < 35) {
    return { cumple: false, motivo: "El descanso semanal es menor a las 35 horas mínimas." };
  }
  return { cumple: true };
}
