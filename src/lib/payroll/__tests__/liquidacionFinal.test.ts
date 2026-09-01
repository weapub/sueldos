import { describe, it, expect } from "vitest";
import { money } from "../money";
import { calcularLiquidacionFinal } from "../liquidacionFinal";

describe("calcularLiquidacionFinal", () => {
  it("despido sin causa a mitad de mes: días trabajados, SAC prop, vacaciones, integración", () => {
    const r = calcularLiquidacionFinal({
      fechaIngreso: new Date("2022-01-10T00:00:00.000Z"),
      fechaEgreso: new Date("2026-08-15T00:00:00.000Z"), // agosto tiene 31 días
      motivo: "DESPIDO_SIN_CAUSA",
      preavisoOtorgado: false,
      remuneracionMensual: money(1000000),
      mejorRemuneracionSemestre: money(1000000),
      diasVacacionesGozadas: 0,
      montoPreaviso: money(2000000),
    });

    // días trabajados: 15/31 de 1.000.000
    expect(r.diasTrabajadosMes.dias).toBe(15);
    expect(r.diasTrabajadosMes.monto.toFixed(2)).toBe(money(1000000).times(15).div(31).toDecimalPlaces(2).toFixed(2));
    // integración: 16/31 de 1.000.000
    expect(r.integracionMesDespido.toFixed(2)).toBe(money(1000000).times(16).div(31).toDecimalPlaces(2).toFixed(2));
    // SAC sobre integración = integración / 12
    expect(r.sacSobreIntegracion.toFixed(2)).toBe(r.integracionMesDespido.div(12).toDecimalPlaces(2).toFixed(2));
    // SAC sobre preaviso = 2.000.000 / 12 (preaviso no otorgado)
    expect(r.sacSobrePreaviso.toFixed(2)).toBe("166666.67");
    // SAC proporcional del 2º semestre (jul-dic): trabajó jul 1 → ago 15 = 46 días de 184
    expect(r.sacProporcional.toFixed(2)).toBe(money(500000).times(46).div(184).toDecimalPlaces(2).toFixed(2));
    // vacaciones: 21 días/año (antigüedad 4 años → <5 = 14... 2022-01-10 a 2026-08-15 = 4 años) → 14 días
    expect(r.vacacionesNoGozadas.dias).toBeGreaterThan(0);
    // subtotal = suma de todos los rubros
    const suma = r.diasTrabajadosMes.monto
      .plus(r.sacProporcional)
      .plus(r.vacacionesNoGozadas.monto)
      .plus(r.integracionMesDespido)
      .plus(r.sacSobreIntegracion)
      .plus(r.sacSobrePreaviso);
    expect(r.subtotalFinal.toFixed(2)).toBe(suma.toFixed(2));
  });

  it("renuncia a fin de mes: sin integración, sin SAC sobre preaviso", () => {
    const r = calcularLiquidacionFinal({
      fechaIngreso: new Date("2020-03-01T00:00:00.000Z"),
      fechaEgreso: new Date("2026-06-30T00:00:00.000Z"),
      motivo: "RENUNCIA",
      preavisoOtorgado: true,
      remuneracionMensual: money(900000),
      mejorRemuneracionSemestre: money(900000),
      diasVacacionesGozadas: 5,
    });

    expect(r.integracionMesDespido.toFixed(2)).toBe("0.00");
    expect(r.sacSobreIntegracion.toFixed(2)).toBe("0.00");
    expect(r.sacSobrePreaviso.toFixed(2)).toBe("0.00");
    expect(r.diasTrabajadosMes.dias).toBe(30);
    // 1º semestre completo → SAC prop ≈ SAC completo (900.000/2)
    expect(r.sacProporcional.toFixed(2)).toBe("450000.00");
  });
});
