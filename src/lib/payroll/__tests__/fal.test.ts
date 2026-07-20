import { describe, it, expect } from "vitest";
import { money } from "../money";
import { calcularContribucionMensualFAL, evaluarCoberturaFal } from "../fal";

const tasas = { falGrande: money(0.01), falPyme: money(0.025) };

describe("calcularContribucionMensualFAL", () => {
  it("aplica 1% para empresas grandes", () => {
    expect(calcularContribucionMensualFAL(money(10000000), "GRANDE", tasas).toFixed(2)).toBe("100000.00");
  });

  it("aplica 2.5% para PyMEs", () => {
    expect(calcularContribucionMensualFAL(money(10000000), "PYME", tasas).toFixed(2)).toBe("250000.00");
  });
});

describe("evaluarCoberturaFal", () => {
  it("deniega cobertura si no se cumplió la carencia de 6 meses desde el alta del fondo", () => {
    const resultado = evaluarCoberturaFal({
      fal: { fechaAlta: new Date("2026-06-01"), saldoActual: money(5000000) },
      legajo: { fechaIngreso: new Date("2015-01-01") },
      fechaEgreso: new Date("2026-09-01"), // solo 3 meses desde el alta
      montoSolicitado: money(1000000),
    });
    expect(resultado.cumpleCarencia).toBe(false);
    expect(resultado.montoCubiertoPorFondo.toFixed(2)).toBe("0.00");
    expect(resultado.montoACargoEmpleador.toFixed(2)).toBe("1000000.00");
  });

  it("deniega cobertura si el legajo tiene menos de 12 meses de antigüedad", () => {
    const resultado = evaluarCoberturaFal({
      fal: { fechaAlta: new Date("2020-01-01"), saldoActual: money(5000000) },
      legajo: { fechaIngreso: new Date("2026-01-01") },
      fechaEgreso: new Date("2026-09-01"), // 8 meses de antigüedad
      montoSolicitado: money(1000000),
    });
    expect(resultado.cumpleAntiguedadMinima).toBe(false);
    expect(resultado.montoCubiertoPorFondo.toFixed(2)).toBe("0.00");
  });

  it("cubre el monto completo si el saldo alcanza y se cumplen los requisitos", () => {
    const resultado = evaluarCoberturaFal({
      fal: { fechaAlta: new Date("2020-01-01"), saldoActual: money(5000000) },
      legajo: { fechaIngreso: new Date("2015-01-01") },
      fechaEgreso: new Date("2026-09-01"),
      montoSolicitado: money(1000000),
    });
    expect(resultado.cumpleCarencia).toBe(true);
    expect(resultado.cumpleAntiguedadMinima).toBe(true);
    expect(resultado.montoCubiertoPorFondo.toFixed(2)).toBe("1000000.00");
    expect(resultado.montoACargoEmpleador.toFixed(2)).toBe("0.00");
  });

  it("cobertura parcial cuando el saldo del fondo es insuficiente", () => {
    const resultado = evaluarCoberturaFal({
      fal: { fechaAlta: new Date("2020-01-01"), saldoActual: money(300000) },
      legajo: { fechaIngreso: new Date("2015-01-01") },
      fechaEgreso: new Date("2026-09-01"),
      montoSolicitado: money(1000000),
    });
    expect(resultado.montoCubiertoPorFondo.toFixed(2)).toBe("300000.00");
    expect(resultado.montoACargoEmpleador.toFixed(2)).toBe("700000.00");
  });
});
