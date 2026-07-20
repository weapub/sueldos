import { describe, it, expect } from "vitest";
import { money } from "../money";
import {
  calcularAntiguedadAnios,
  calcularIndemnizacionArt245,
  calcularPreaviso,
  calcularAjusteReingreso,
  calcularDistribucionFallecimiento,
  calcularIndemnizacion,
} from "../indemnizacion";

describe("calcularAntiguedadAnios", () => {
  it("antigüedad exacta de años completos, sin fracción", () => {
    // 5 años exactos
    expect(calcularAntiguedadAnios(new Date("2020-03-01"), new Date("2025-03-01"))).toBe(5);
  });

  it("fracción <= 3 meses no suma un año adicional", () => {
    // 5 años + 3 meses exactos
    expect(calcularAntiguedadAnios(new Date("2020-03-01"), new Date("2025-06-01"))).toBe(5);
  });

  it("fracción > 3 meses redondea al año siguiente", () => {
    // 5 años + 4 meses
    expect(calcularAntiguedadAnios(new Date("2020-03-01"), new Date("2025-07-01"))).toBe(6);
  });
});

describe("calcularIndemnizacionArt245", () => {
  it("aplica el tope de convenio (3x) cuando está por debajo del monto sin tope y por encima del piso del 67%", () => {
    const result = calcularIndemnizacionArt245({
      base: { remuneracionFijaHabitual: money(1000000), remuneracionesVariablesUltimos12Meses: [] },
      fechaIngreso: new Date("2016-01-01"),
      fechaEgreso: new Date("2026-01-01"), // 10 años
      salarioBaseConvenio: money(500000), // tope = 1,500,000
    });

    // sin tope = 1,000,000 * 10 = 10,000,000; tope = 1,500,000; piso 67% = 6,700,000
    // el tope (1,500,000) es MENOR al piso 67% (6,700,000) => el piso debe prevalecer
    expect(result.indemnizacionSinTope.toFixed(2)).toBe("10000000.00");
    expect(result.topeConvenio.toFixed(2)).toBe("1500000.00");
    expect(result.pisoGarantia67.toFixed(2)).toBe("6700000.00");
    expect(result.indemnizacionFinal.toFixed(2)).toBe("6700000.00");
  });

  it("el piso del 67% prevalece cuando el tope de convenio cae por debajo de él", () => {
    const result = calcularIndemnizacionArt245({
      base: { remuneracionFijaHabitual: money(2000000), remuneracionesVariablesUltimos12Meses: [] },
      fechaIngreso: new Date("2020-01-01"),
      fechaEgreso: new Date("2026-01-01"), // 6 años
      salarioBaseConvenio: money(300000), // tope = 900,000, muy bajo respecto al sueldo real
    });
    // sin tope = 2,000,000 * 6 = 12,000,000; piso 67% = 8,040,000; tope = 900,000
    expect(result.indemnizacionConTope.toFixed(2)).toBe("900000.00");
    expect(result.pisoGarantia67.toFixed(2)).toBe("8040000.00");
    expect(result.indemnizacionFinal.toFixed(2)).toBe("8040000.00");
  });

  it("nunca resulta menor a 1 mes de la base art. 245", () => {
    const result = calcularIndemnizacionArt245({
      base: { remuneracionFijaHabitual: money(1000000), remuneracionesVariablesUltimos12Meses: [] },
      fechaIngreso: new Date("2025-12-01"),
      fechaEgreso: new Date("2026-01-15"), // menos de un año, fracción > 3 meses => 1 año
      salarioBaseConvenio: money(100000), // tope muy bajo = 300,000
    });
    // sin tope = 1,000,000 * 1 = 1,000,000; tope = 300,000; piso67% = 670,000; piso 1 mes = 1,000,000
    expect(result.indemnizacionFinal.toFixed(2)).toBe("1000000.00");
  });

  it("usa el mayor entre el promedio de 6 y 12 meses para los conceptos variables", () => {
    const variables12Meses = [
      money(100000), money(100000), money(100000), money(100000), money(100000), money(100000),
      money(300000), money(300000), money(300000), money(300000), money(300000), money(300000),
    ];
    const result = calcularIndemnizacionArt245({
      base: { remuneracionFijaHabitual: money(1000000), remuneracionesVariablesUltimos12Meses: variables12Meses },
      fechaIngreso: new Date("2025-01-01"),
      fechaEgreso: new Date("2026-01-01"),
      salarioBaseConvenio: money(10000000),
    });
    // promedio 6 (últimos) = 300,000; promedio 12 = 200,000 => se usa el mayor (300,000)
    expect(result.baseArt245.toFixed(2)).toBe("1300000.00");
  });
});

describe("calcularPreaviso", () => {
  it("no corresponde preaviso durante el período de prueba", () => {
    const result = calcularPreaviso({
      antiguedadAnios: 0,
      enPeriodoDePrueba: true,
      preavisoOtorgado: false,
      baseArt245: money(1000000),
    });
    expect(result.mesesPreaviso).toBe(0);
    expect(result.montoPreaviso.toFixed(2)).toBe("0.00");
  });

  it("1 mes de preaviso con antigüedad <= 5 años", () => {
    const result = calcularPreaviso({
      antiguedadAnios: 5,
      enPeriodoDePrueba: false,
      preavisoOtorgado: false,
      baseArt245: money(1000000),
    });
    expect(result.mesesPreaviso).toBe(1);
    expect(result.montoPreaviso.toFixed(2)).toBe("1000000.00");
  });

  it("2 meses de preaviso con antigüedad > 5 años", () => {
    const result = calcularPreaviso({
      antiguedadAnios: 6,
      enPeriodoDePrueba: false,
      preavisoOtorgado: false,
      baseArt245: money(1000000),
    });
    expect(result.mesesPreaviso).toBe(2);
    expect(result.montoPreaviso.toFixed(2)).toBe("2000000.00");
  });

  it("no corresponde preaviso sustitutivo si ya fue otorgado (trabajado)", () => {
    const result = calcularPreaviso({
      antiguedadAnios: 6,
      enPeriodoDePrueba: false,
      preavisoOtorgado: true,
      baseArt245: money(1000000),
    });
    expect(result.montoPreaviso.toFixed(2)).toBe("0.00");
  });
});

describe("calcularAjusteReingreso", () => {
  it("nunca resulta menor a la indemnización calculada solo con el último período", () => {
    const resultado = calcularAjusteReingreso({
      indemnizacionAntiguedadCompleta: money(5000000),
      montoIndemnizacionAnteriorPagada: money(4800000), // casi todo indexado ya se pagó antes
      ipcAcumulado: 1.0,
      indemnizacionSoloUltimoPeriodo: money(600000),
    });
    // diferencia = 5,000,000 - 4,800,000 = 200,000; pero el piso del último período es 600,000
    expect(resultado.toFixed(2)).toBe("600000.00");
  });

  it("usa la diferencia indexada cuando es mayor al piso del último período", () => {
    const resultado = calcularAjusteReingreso({
      indemnizacionAntiguedadCompleta: money(5000000),
      montoIndemnizacionAnteriorPagada: money(1000000),
      ipcAcumulado: 1.2,
      indemnizacionSoloUltimoPeriodo: money(600000),
    });
    // monto indexado = 1,000,000 * 1.2 = 1,200,000; diferencia = 3,800,000 > 600,000
    expect(resultado.toFixed(2)).toBe("3800000.00");
  });
});

describe("calcularDistribucionFallecimiento", () => {
  it("reparte en partes iguales entre beneficiarios concurrentes del primer grupo", () => {
    const resultado = calcularDistribucionFallecimiento(money(3000000), [
      { nombre: "Cónyuge", vinculo: "CONYUGE_CONVIVIENTE" },
      { nombre: "Hijo 1", vinculo: "HIJO_MENOR" },
      { nombre: "Hijo 2", vinculo: "HIJO_MENOR" },
    ]);
    expect(resultado).toHaveLength(3);
    expect(resultado.every((r) => r.montoAsignado.toFixed(2) === "1000000.00")).toBe(true);
  });

  it("los padres solo heredan si no hay beneficiarios del primer grupo", () => {
    const resultado = calcularDistribucionFallecimiento(money(1000000), [
      { nombre: "Madre", vinculo: "PADRE_MADRE" },
      { nombre: "Padre", vinculo: "PADRE_MADRE" },
    ]);
    expect(resultado).toHaveLength(2);
    expect(resultado.every((r) => r.montoAsignado.toFixed(2) === "500000.00")).toBe(true);
  });

  it("ignora a los padres si hay beneficiarios del primer grupo", () => {
    const resultado = calcularDistribucionFallecimiento(money(1000000), [
      { nombre: "Hijo", vinculo: "HIJO_MENOR" },
      { nombre: "Madre", vinculo: "PADRE_MADRE" },
    ]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].nombre).toBe("Hijo");
  });

  it("el reparto suma exacto el monto total pese al redondeo", () => {
    const resultado = calcularDistribucionFallecimiento(money(1000000), [
      { nombre: "H1", vinculo: "HIJO_MENOR" },
      { nombre: "H2", vinculo: "HIJO_MENOR" },
      { nombre: "H3", vinculo: "HIJO_MENOR" },
    ]);
    const total = resultado.reduce((acc, r) => acc.plus(r.montoAsignado), money(0));
    expect(total.toFixed(2)).toBe("1000000.00");
  });
});

describe("calcularIndemnizacion (orquestador)", () => {
  it("despido sin causa: indemnización + preaviso", () => {
    const resultado = calcularIndemnizacion({
      motivo: "DESPIDO_SIN_CAUSA",
      fechaIngreso: new Date("2016-01-01"),
      fechaEgreso: new Date("2026-01-01"), // 10 años
      enPeriodoDePrueba: false,
      preavisoOtorgado: false,
      base: { remuneracionFijaHabitual: money(1000000), remuneracionesVariablesUltimos12Meses: [] },
      salarioBaseConvenio: money(10000000), // tope muy alto, no se activa
    });
    // indemnización = 1,000,000 * 10 = 10,000,000; preaviso (>5 años) = 2 meses = 2,000,000
    expect(resultado.montoIndemnizacionAntiguedad.toFixed(2)).toBe("10000000.00");
    expect(resultado.preaviso.montoPreaviso.toFixed(2)).toBe("2000000.00");
    expect(resultado.montoTotal.toFixed(2)).toBe("12000000.00");
  });

  it("renuncia: no corresponde indemnización ni preaviso", () => {
    const resultado = calcularIndemnizacion({
      motivo: "RENUNCIA",
      fechaIngreso: new Date("2016-01-01"),
      fechaEgreso: new Date("2026-01-01"),
      enPeriodoDePrueba: false,
      preavisoOtorgado: false,
      base: { remuneracionFijaHabitual: money(1000000), remuneracionesVariablesUltimos12Meses: [] },
      salarioBaseConvenio: money(10000000),
    });
    expect(resultado.montoTotal.toFixed(2)).toBe("0.00");
  });

  it("fallecimiento: distribuye el monto entre beneficiarios", () => {
    const resultado = calcularIndemnizacion({
      motivo: "FALLECIMIENTO",
      fechaIngreso: new Date("2021-01-01"),
      fechaEgreso: new Date("2026-01-01"), // 5 años
      enPeriodoDePrueba: false,
      preavisoOtorgado: false,
      base: { remuneracionFijaHabitual: money(1000000), remuneracionesVariablesUltimos12Meses: [] },
      salarioBaseConvenio: money(10000000),
      fallecimiento: { beneficiarios: [{ nombre: "Cónyuge", vinculo: "CONYUGE_CONVIVIENTE" }] },
    });
    expect(resultado.beneficiariosFallecimiento).toHaveLength(1);
    expect(resultado.beneficiariosFallecimiento?.[0].montoAsignado.toFixed(2)).toBe("5000000.00");
  });
});
