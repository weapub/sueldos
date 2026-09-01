import { describe, it, expect } from "vitest";
import { money } from "../money";
import { calcularRetencionGanancias, type GananciasParametroInput } from "../ganancias";

// Escala simplificada anual: 0-10M → 5%, 10M-30M → fijo 500k + 15% s/excedente, 30M+ → fijo 3.5M + 35%.
const parametro: GananciasParametroInput = {
  mni: money(3000000),
  deduccionEspecial: money(14000000),
  deduccionConyuge: money(2800000),
  deduccionHijo: money(1400000),
  tramos: [
    { desde: money(0), hasta: money(10000000), montoFijo: money(0), porcentaje: money(0.05) },
    { desde: money(10000000), hasta: money(30000000), montoFijo: money(500000), porcentaje: money(0.15) },
    { desde: money(30000000), hasta: null, montoFijo: money(3500000), porcentaje: money(0.35) },
  ],
};

describe("calcularRetencionGanancias", () => {
  it("sueldo bajo (bajo el MNI proporcional): retención 0", () => {
    const r = calcularRetencionGanancias({
      mes: 1,
      esMesSAC: false,
      remBrutaMes: money(1500000),
      deduccionesGeneralesMes: money(255000), // 17%
      otrasDeduccionesMes: money(0),
      computaConyuge: false,
      cantidadHijos: 0,
      acumPrevio: { gananciaNetaAcum: money(0), retenidoAcum: money(0) },
      parametro,
    });
    // deducciones personales enero = (3M + 14M)/12 ≈ 1.416.667 > ganancia neta del mes → 0
    expect(r.retencionMes.toFixed(2)).toBe("0.00");
    expect(r.gananciaNetaAcum.toFixed(2)).toBe("1245000.00");
  });

  it("sueldo alto: retiene el impuesto acumulado menos lo ya retenido", () => {
    // Mes 6, acumulado previo: ganancia neta 30M, ya retenido 400k.
    const r = calcularRetencionGanancias({
      mes: 6,
      esMesSAC: false,
      remBrutaMes: money(8000000),
      deduccionesGeneralesMes: money(1360000),
      otrasDeduccionesMes: money(0),
      computaConyuge: false,
      cantidadHijos: 0,
      acumPrevio: { gananciaNetaAcum: money(30000000), retenidoAcum: money(400000) },
      parametro,
    });
    // ganancia neta mes = 8M - 1.36M = 6.64M → acum = 36.64M
    expect(r.gananciaNetaAcum.toFixed(2)).toBe("36640000.00");
    // ded. personales acum junio = (17M) * 6/12 = 8.5M
    expect(r.deduccionesPersonalesAcum.toFixed(2)).toBe("8500000.00");
    // sujeta = 36.64M - 8.5M = 28.14M. Tramos prorrateados ×0.5: tramo 3 (desde 15M): fijo 1.75M + (28.14M-15M)*0.35
    // = 1.750.000 + 13.14M*0.35 = 1.750.000 + 4.599.000 = 6.349.000
    expect(r.impuestoDeterminadoAcum.toFixed(2)).toBe("6349000.00");
    expect(r.retencionMes.toFixed(2)).toBe("5949000.00"); // 6.349.000 - 400.000
  });

  it("si el impuesto acumulado baja, la retención del mes es negativa (devolución)", () => {
    const r = calcularRetencionGanancias({
      mes: 7,
      esMesSAC: false,
      remBrutaMes: money(500000),
      deduccionesGeneralesMes: money(85000),
      otrasDeduccionesMes: money(5000000), // gran deducción retroactiva
      computaConyuge: false,
      cantidadHijos: 0,
      acumPrevio: { gananciaNetaAcum: money(20000000), retenidoAcum: money(1000000) },
      parametro,
    });
    expect(r.retencionMes.toNumber()).toBeLessThan(0);
  });
});
