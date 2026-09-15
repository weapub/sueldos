import { describe, it, expect } from "vitest";
import { money } from "../money";
import {
  resolverReglasConvenio,
  calcularMontoAntiguedadSegunReglas,
  calcularMontoPresentismoSegunReglas,
} from "../convenios";
import type { TasasVigentes } from "../types";

const tasas: TasasVigentes = {
  aporteJubilacion: money(0.11),
  aporteLey19032Pami: money(0.03),
  aporteObraSocial: money(0.06),
  contribJubilacion: money(0.1077),
  contribLey19032: money(0.0159),
  contribObraSocial: money(0.06),
  contribArt: money(0.03),
  contribAsigFamiliares: money(0),
  contribFNE: money(0),
  artFfepFijo: money(0),
  svoFijo: money(0),
  contribSindical: money(0.04),
  falGrande: money(0.01),
  falPyme: money(0.025),
  topeDeduccionGeneral: money(0.2),
  topeDeduccionSindical: money(0.02),
  antiguedadPorcentajeAnio: money(0.01),
  deduccionFaecys: money(0.005),
  deduccionAporteProvincial: money(0),
  aporteSolidarioFijo: money(0),
  riflReduccionContribuciones: money(0),
  divisorHorasMes: money(200),
  antiguedadMontoFijoAnioUecara: money("9776"),
  presentismoPorcentajeUecara: money(0.1),
  cuotaSindicalUecara: money(0.02),
};

describe("resolverReglasConvenio", () => {
  it("Comercio: antigüedad % del básico, presentismo fórmula Comercio, sin deducciones sindicales propias", () => {
    const reglas = resolverReglasConvenio("COMERCIO_130_75", tasas);
    expect(reglas.antiguedad).toEqual({ forma: "PORCENTAJE_BASICO", tasaPorAnio: tasas.antiguedadPorcentajeAnio });
    expect(reglas.presentismo).toEqual({ forma: "FORMULA_COMERCIO" });
    expect(reglas.deduccionesSindicales).toEqual([]);
  });

  it("UECARA: antigüedad monto fijo por año, presentismo % flat, cuota sindical propia", () => {
    const reglas = resolverReglasConvenio("UECARA_660_13", tasas);
    expect(reglas.antiguedad).toEqual({ forma: "MONTO_FIJO_ANIO", montoPorAnio: tasas.antiguedadMontoFijoAnioUecara });
    expect(reglas.presentismo).toEqual({ forma: "PORCENTAJE_FLAT_BASICO", tasa: tasas.presentismoPorcentajeUecara });
    expect(reglas.deduccionesSindicales).toEqual([
      { codigoConcepto: "30013", nombre: "Cuota sindical UECARA", tasa: tasas.cuotaSindicalUecara },
    ]);
  });

  it("UECARA con cuota sindical en 0 no emite la deducción (sin cargar todavía)", () => {
    const reglas = resolverReglasConvenio("UECARA_660_13", { ...tasas, cuotaSindicalUecara: money(0) });
    expect(reglas.deduccionesSindicales).toEqual([]);
  });
});

describe("calcularMontoAntiguedadSegunReglas", () => {
  it("NINGUNA → 0 sin importar la base/años", () => {
    expect(calcularMontoAntiguedadSegunReglas({ forma: "NINGUNA" }, money(500000), 5).toFixed(2)).toBe("0.00");
  });

  it("PORCENTAJE_BASICO delega en calcularAntiguedadImporte", () => {
    const monto = calcularMontoAntiguedadSegunReglas(
      { forma: "PORCENTAJE_BASICO", tasaPorAnio: money(0.01) },
      money(300000),
      3,
    );
    expect(monto.toFixed(2)).toBe("9000.00");
  });

  it("MONTO_FIJO_ANIO delega en calcularAntiguedadImporteFijo, ignora la base", () => {
    const monto = calcularMontoAntiguedadSegunReglas(
      { forma: "MONTO_FIJO_ANIO", montoPorAnio: money("9776") },
      money(300000),
      3,
    );
    expect(monto.toFixed(2)).toBe("29328.00");
  });
});

describe("calcularMontoPresentismoSegunReglas", () => {
  it("NINGUNO → 0", () => {
    expect(calcularMontoPresentismoSegunReglas({ forma: "NINGUNO" }, money(300000), money(9000)).toFixed(2)).toBe(
      "0.00",
    );
  });

  it("FORMULA_COMERCIO delega en calcularPresentismo, (base+antigüedad)/12", () => {
    const monto = calcularMontoPresentismoSegunReglas({ forma: "FORMULA_COMERCIO" }, money(300000), money(9000));
    expect(monto.toFixed(2)).toBe("25750.00");
  });

  it("PORCENTAJE_FLAT_BASICO ignora la antigüedad", () => {
    const monto = calcularMontoPresentismoSegunReglas(
      { forma: "PORCENTAJE_FLAT_BASICO", tasa: money(0.1) },
      money(300000),
      money(9000),
    );
    expect(monto.toFixed(2)).toBe("30000.00");
  });
});
