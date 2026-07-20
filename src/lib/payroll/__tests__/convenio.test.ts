import { describe, it, expect } from "vitest";
import { money } from "../money";
import { calcularAntiguedadImporte, calcularPresentismo, PRESENTISMO_DIVISOR_DEFAULT } from "../convenio";

describe("calcularAntiguedadImporte", () => {
  it("caso de regresión GONZALEZ IVAN: 236.162,3245 x 3 años x 1% = 7.084,87", () => {
    const resultado = calcularAntiguedadImporte(money("236162.3245"), 3, money(0.01));
    expect(resultado.toFixed(2)).toBe("7084.87");
  });
});

describe("calcularPresentismo", () => {
  it("caso de regresión GONZALEZ IVAN: (236.162,3245 + 7.084,869735) / 12 = 20.270,60", () => {
    const resultado = calcularPresentismo(money("236162.3245"), money("7084.869735"));
    expect(resultado.toFixed(2)).toBe("20270.60");
  });

  it("usa exactamente 1/12 (no 0.08333 redondeado) para evitar desvíos a montos grandes", () => {
    // Con 0.08333 fijo el resultado daría 20268.53... — el desvío de ~$2 sería inaceptable.
    const resultado = calcularPresentismo(money("243247.19423499997"), money(0));
    expect(resultado.toFixed(2)).toBe("20270.60");
  });

  it("acepta un divisor distinto de 12 si el convenio lo requiere", () => {
    expect(PRESENTISMO_DIVISOR_DEFAULT).toBe(12);
    const resultado = calcularPresentismo(money(1200), money(0), 10);
    expect(resultado.toFixed(2)).toBe("120.00");
  });
});
