import { describe, it, expect } from "vitest";
import { money } from "../money";
import { calcularDepositoMensualFCL } from "../fondoCese";

const tasas = { fondoCeseTasaPrimerAnio: money(0.12), fondoCeseTasaDesdeSegundoAnio: money(0.08) };

describe("calcularDepositoMensualFCL", () => {
  it("12% durante el primer año de antigüedad (< 1 año)", () => {
    const resultado = calcularDepositoMensualFCL(money(900000), 0, tasas);
    expect(resultado.toFixed(2)).toBe("108000.00");
  });

  it("8% desde el segundo año (>= 1 año)", () => {
    const resultado = calcularDepositoMensualFCL(money(900000), 1, tasas);
    expect(resultado.toFixed(2)).toBe("72000.00");
  });

  it("8% también con antigüedad mucho mayor a 1 año", () => {
    const resultado = calcularDepositoMensualFCL(money(900000), 10, tasas);
    expect(resultado.toFixed(2)).toBe("72000.00");
  });

  it("con las tasas en 0 (sin cargar todavía) el depósito es 0", () => {
    const resultado = calcularDepositoMensualFCL(money(900000), 0, {
      fondoCeseTasaPrimerAnio: money(0),
      fondoCeseTasaDesdeSegundoAnio: money(0),
    });
    expect(resultado.toFixed(2)).toBe("0.00");
  });
});
