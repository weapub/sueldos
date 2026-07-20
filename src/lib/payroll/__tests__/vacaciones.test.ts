import { describe, it, expect } from "vitest";
import { money } from "../money";
import { diasVacacionesPorAntiguedad, calcularVacacionesProporcionales } from "../vacaciones";

describe("diasVacacionesPorAntiguedad", () => {
  it("14 días con antigüedad menor a 5 años", () => {
    expect(diasVacacionesPorAntiguedad(new Date("2023-01-01"), new Date("2026-07-20"))).toBe(14);
  });

  it("21 días con antigüedad entre 5 y 10 años", () => {
    expect(diasVacacionesPorAntiguedad(new Date("2020-01-01"), new Date("2026-07-20"))).toBe(21);
  });

  it("28 días con antigüedad entre 10 y 20 años", () => {
    expect(diasVacacionesPorAntiguedad(new Date("2014-01-01"), new Date("2026-07-20"))).toBe(28);
  });

  it("35 días con antigüedad de 20 años o más", () => {
    expect(diasVacacionesPorAntiguedad(new Date("2000-01-01"), new Date("2026-07-20"))).toBe(35);
  });

  it("no computa el año en curso hasta cumplir el aniversario", () => {
    // ingresó el 2021-08-01, a la fecha de cálculo (2026-07-20) todavía no cumplió el aniversario de este año
    expect(diasVacacionesPorAntiguedad(new Date("2021-08-01"), new Date("2026-07-20"))).toBe(14);
    // un día después de cumplir el aniversario, ya tiene 5 años
    expect(diasVacacionesPorAntiguedad(new Date("2021-08-01"), new Date("2026-08-02"))).toBe(21);
  });
});

describe("calcularVacacionesProporcionales", () => {
  it("calcula proporcional al egresar a mitad de año (1 día cada 20 trabajados)", () => {
    const { dias } = calcularVacacionesProporcionales(
      new Date("2015-01-01"), // antigüedad > 10 años => 28 días corresponden
      new Date("2026-07-01"), // egresa habiendo trabajado desde el 1/1 hasta el 1/7 del año
      money(10000),
    );
    // días trabajados en el año = 1/1 a 1/7 = 182 días; 28 * 182 / 365 ≈ 13
    expect(dias).toBe(13);
  });
});
