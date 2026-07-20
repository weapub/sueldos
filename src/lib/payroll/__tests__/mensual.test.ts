import { describe, it, expect } from "vitest";
import { money } from "../money";
import { calcularLiquidacionMensual } from "../mensual";
import type { ConceptoInput, TasasVigentes } from "../types";

const tasas: TasasVigentes = {
  aporteJubilacion: money(0.11),
  aporteLey19032Pami: money(0.03),
  aporteObraSocial: money(0.03),
  contribJubilacion: money(0.107),
  contribLey19032: money(0.015),
  contribObraSocial: money(0.06),
  contribArt: money(0.035),
  contribAsigFamiliares: money(0),
  contribFNE: money(0),
  artFfepFijo: money(0),
  svoFijo: money(0),
  contribSindical: money(0.02),
  falGrande: money(0.01),
  falPyme: money(0.025),
  topeDeduccionGeneral: money(0.2),
  topeDeduccionSindical: money(0.02),
  antiguedadPorcentajeAnio: money(0),
  deduccionFaecys: money(0),
  deduccionAporteProvincial: money(0),
  aporteSolidarioFijo: money(0),
  riflReduccionContribuciones: money(0),
};

describe("calcularLiquidacionMensual", () => {
  it("liquida un sueldo mensual básico sin extras: aportes 11%+3%+3% exactos", () => {
    const result = calcularLiquidacionMensual({
      legajo: {
        sueldoBasico: money(1000000),
        horasSemanalesFullTime: money(48),
        modalidadRemuneracion: "MENSUAL",
      },
      anio: 2026,
      mes: 7,
      diasTrabajados: 31,
      diasEnMes: 31,
      esMesSAC: false,
      conceptos: [],
      tasas,
    });

    expect(result.totalRemunerativo.toFixed(2)).toBe("1000000.00");
    expect(result.totalNoRemunerativo.toFixed(2)).toBe("0.00");
    // aportes = 1,000,000 * 17% = 170,000
    expect(result.totalDeducciones.toFixed(2)).toBe("170000.00");
    expect(result.neto.toFixed(2)).toBe("830000.00");
  });

  it("prorratea el básico part-time 20/40hs (art. 92 ter)", () => {
    const result = calcularLiquidacionMensual({
      legajo: {
        sueldoBasico: money(800000),
        horasSemanales: money(20),
        horasSemanalesFullTime: money(40),
        modalidadRemuneracion: "MENSUAL",
      },
      anio: 2026,
      mes: 7,
      diasTrabajados: 31,
      diasEnMes: 31,
      esMesSAC: false,
      conceptos: [],
      tasas,
    });

    // 800,000 * 20/40 = 400,000
    expect(result.totalRemunerativo.toFixed(2)).toBe("400000.00");
  });

  it("prorratea el básico por días trabajados en el mes de ingreso", () => {
    const result = calcularLiquidacionMensual({
      legajo: {
        sueldoBasico: money(310000),
        horasSemanalesFullTime: money(48),
        modalidadRemuneracion: "MENSUAL",
      },
      anio: 2026,
      mes: 7,
      diasTrabajados: 10,
      diasEnMes: 31,
      esMesSAC: false,
      conceptos: [],
      tasas,
    });

    // 310,000 * 10/31 = 100,000.00
    expect(result.totalRemunerativo.toFixed(2)).toBe("100000.00");
  });

  it("calcula el SAC como mejor remuneración del semestre / 2, y lo excluye de afectaSAC", () => {
    const result = calcularLiquidacionMensual({
      legajo: {
        sueldoBasico: money(1000000),
        horasSemanalesFullTime: money(48),
        modalidadRemuneracion: "MENSUAL",
      },
      anio: 2026,
      mes: 6,
      diasTrabajados: 30,
      diasEnMes: 30,
      esMesSAC: true,
      mejorRemuneracionSemestre: money(1200000),
      conceptos: [],
      tasas,
    });

    const sacConcepto = result.conceptos.find((c) => c.id === "SAC");
    expect(sacConcepto?.monto.toFixed(2)).toBe("600000.00");
    expect(sacConcepto?.afectaSAC).toBe(false);
    expect(result.totalRemunerativo.toFixed(2)).toBe("1600000.00");
  });

  it("excluye del cálculo de aportes/contribuciones los beneficios sociales del art. 103 bis", () => {
    const conceptos: ConceptoInput[] = [
      {
        id: "c1",
        codigo: "TICKET_COMIDA",
        nombre: "Ticket comida",
        tipo: "NO_REMUNERATIVO",
        subtipo: "BENEFICIO_SOCIAL_103BIS",
        monto: money(150000),
        afectaAportes: false,
        afectaContribuciones: false,
        afectaSAC: false,
        esVariable: false,
        requiereConsentimiento: false,
        consentimientoFirmado: false,
      },
    ];

    const result = calcularLiquidacionMensual({
      legajo: {
        sueldoBasico: money(1000000),
        horasSemanalesFullTime: money(48),
        modalidadRemuneracion: "MENSUAL",
      },
      anio: 2026,
      mes: 7,
      diasTrabajados: 31,
      diasEnMes: 31,
      esMesSAC: false,
      conceptos,
      tasas,
    });

    expect(result.totalNoRemunerativo.toFixed(2)).toBe("150000.00");
    // Aportes solo sobre el básico remunerativo (1,000,000 * 17%), el beneficio social no aporta.
    expect(result.totalDeducciones.toFixed(2)).toBe("170000.00");
    expect(result.neto.toFixed(2)).toBe("980000.00");
  });

  it("mantiene sujetos a aportes/contribuciones los conceptos dinámicos del art. 104 bis", () => {
    const conceptos: ConceptoInput[] = [
      {
        id: "c1",
        codigo: "BONO_VARIABLE",
        nombre: "Bono por objetivos",
        tipo: "REMUNERATIVO",
        subtipo: "DINAMICO_104BIS",
        monto: money(100000),
        afectaAportes: true,
        afectaContribuciones: true,
        afectaSAC: false,
        esVariable: true,
        requiereConsentimiento: false,
        consentimientoFirmado: false,
      },
    ];

    const result = calcularLiquidacionMensual({
      legajo: {
        sueldoBasico: money(1000000),
        horasSemanalesFullTime: money(48),
        modalidadRemuneracion: "MENSUAL",
      },
      anio: 2026,
      mes: 7,
      diasTrabajados: 31,
      diasEnMes: 31,
      esMesSAC: false,
      conceptos,
      tasas,
    });

    // (1,000,000 + 100,000) * 17% = 187,000
    expect(result.totalDeducciones.toFixed(2)).toBe("187000.00");
  });

  it("recorta deducciones que exceden el 20% y emite un warning", () => {
    const conceptos: ConceptoInput[] = [
      {
        id: "c1",
        codigo: "PRESTAMO",
        nombre: "Préstamo personal",
        tipo: "DEDUCCION",
        subtipo: "OTRA_DEDUCCION",
        monto: money(500000),
        afectaAportes: false,
        afectaContribuciones: false,
        afectaSAC: false,
        esVariable: false,
        requiereConsentimiento: false,
        consentimientoFirmado: false,
      },
    ];

    const result = calcularLiquidacionMensual({
      legajo: {
        sueldoBasico: money(1000000),
        horasSemanalesFullTime: money(48),
        modalidadRemuneracion: "MENSUAL",
      },
      anio: 2026,
      mes: 7,
      diasTrabajados: 31,
      diasEnMes: 31,
      esMesSAC: false,
      conceptos,
      tasas,
    });

    // tope 20% de 1,000,000 = 200,000 (el préstamo de 500,000 se recorta a 200,000)
    const prestamo = result.conceptos.find((c) => c.id === "c1");
    expect(prestamo?.montoAjustado.toFixed(2)).toBe("200000.00");
    expect(result.warnings.some((w) => w.includes("recortadas"))).toBe(true);
    // deducciones totales = aportes 170,000 + préstamo recortado 200,000
    expect(result.totalDeducciones.toFixed(2)).toBe("370000.00");
  });

  it("no aplica tope a los embargos", () => {
    const conceptos: ConceptoInput[] = [
      {
        id: "c1",
        codigo: "EMBARGO_ALIMENTOS",
        nombre: "Embargo por alimentos",
        tipo: "DEDUCCION",
        subtipo: "EMBARGO",
        monto: money(500000),
        afectaAportes: false,
        afectaContribuciones: false,
        afectaSAC: false,
        esVariable: false,
        requiereConsentimiento: false,
        consentimientoFirmado: false,
      },
    ];

    const result = calcularLiquidacionMensual({
      legajo: {
        sueldoBasico: money(1000000),
        horasSemanalesFullTime: money(48),
        modalidadRemuneracion: "MENSUAL",
      },
      anio: 2026,
      mes: 7,
      diasTrabajados: 31,
      diasEnMes: 31,
      esMesSAC: false,
      conceptos,
      tasas,
    });

    const embargo = result.conceptos.find((c) => c.id === "c1");
    expect(embargo?.montoAjustado.toFixed(2)).toBe("500000.00");
  });

  it("bloquea deducciones que requieren consentimiento no firmado", () => {
    const conceptos: ConceptoInput[] = [
      {
        id: "c1",
        codigo: "SEGURO_VIDA",
        nombre: "Seguro de vida opcional",
        tipo: "DEDUCCION",
        subtipo: "OTRA_DEDUCCION",
        monto: money(20000),
        afectaAportes: false,
        afectaContribuciones: false,
        afectaSAC: false,
        esVariable: false,
        requiereConsentimiento: true,
        consentimientoFirmado: false,
      },
    ];

    const result = calcularLiquidacionMensual({
      legajo: {
        sueldoBasico: money(1000000),
        horasSemanalesFullTime: money(48),
        modalidadRemuneracion: "MENSUAL",
      },
      anio: 2026,
      mes: 7,
      diasTrabajados: 31,
      diasEnMes: 31,
      esMesSAC: false,
      conceptos,
      tasas,
    });

    const seguro = result.conceptos.find((c) => c.id === "c1");
    expect(seguro?.bloqueado).toBe(true);
    expect(seguro?.montoAjustado.toFixed(2)).toBe("0.00");
    // deducciones totales = solo aportes, el seguro bloqueado no descuenta
    expect(result.totalDeducciones.toFixed(2)).toBe("170000.00");
  });
});

describe("caso de regresión GONZALEZ IVAN (GONZALEZ.xlsm, legajo 3, período JUN/2024)", () => {
  // Datos reales del archivo de referencia: VENDEDOR B, ingreso 01/06/2021 (3 años de
  // antigüedad a jun/2024), 24hs contratadas de 48hs full-time, básico de escala 457.088,37,
  // no remunerativo de escala 302.373, 31 días trabajados en un mes de 30 días (dato real del
  // archivo — ver docs/GAP_ANALYSIS.md §1 sobre por qué días trabajados puede superar los
  // días del mes calendario). Tolerancia ±0.01 por redondeo, según lo pactado en
  // INSTRUCCIONES_CLAUDE_CODE.md.
  const tasasComercio: TasasVigentes = {
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
    contribSindical: money(0.04), // SINDICATO, misma tasa aplicada a base rem. y no rem.
    falGrande: money(0.01),
    falPyme: money(0.025),
    topeDeduccionGeneral: money(0.2),
    topeDeduccionSindical: money(0.02),
    antiguedadPorcentajeAnio: money(0.01),
    deduccionFaecys: money(0.005),
    deduccionAporteProvincial: money(0.01), // IPS FSA
    aporteSolidarioFijo: money(100),
    riflReduccionContribuciones: money(0),
  };

  const mejorRemuneracionSemestre = money("263517.79"); // básico + antigüedad + presentismo del propio período (sin historial previo)
  const mejorNoRemuneracionSemestre = money("174322.23"); // adicional NR + antigüedad NR + presentismo NR del propio período

  const resultado = calcularLiquidacionMensual({
    legajo: {
      sueldoBasico: money("457088.37"),
      horasSemanales: money(24),
      horasSemanalesFullTime: money(48),
      modalidadRemuneracion: "MENSUAL",
      antiguedadAnios: 3,
      remuneracionNoRemunerativa: money("302373"),
      afiliadoSindical: true, // sin tope del 2% — coincide con el archivo real (SINDICATO 4% + FAECYS 0.5% sin recortar)
    },
    anio: 2024,
    mes: 6,
    diasTrabajados: 31,
    diasEnMes: 30,
    esMesSAC: true,
    mejorRemuneracionSemestre,
    mejorNoRemuneracionSemestre,
    conceptos: [],
    tasas: tasasComercio,
  });

  it("sueldo básico prorrateado = 236.162,32", () => {
    const c = resultado.conceptos.find((c) => c.id === "BASICO");
    expect(c?.monto.toFixed(2)).toBe("236162.32");
  });

  it("antigüedad = 7.084,87", () => {
    const c = resultado.conceptos.find((c) => c.id === "10002");
    expect(c?.monto.toFixed(2)).toBe("7084.87");
  });

  it("presentismo = 20.270,60", () => {
    const c = resultado.conceptos.find((c) => c.id === "10003");
    expect(c?.monto.toFixed(2)).toBe("20270.60");
  });

  it("SAC 1° semestre = 131.758,90", () => {
    const c = resultado.conceptos.find((c) => c.id === "SAC");
    expect(c?.monto.toFixed(2)).toBe("131758.90");
  });

  it("adicional no remunerativo = 156.226,05", () => {
    const c = resultado.conceptos.find((c) => c.id === "20001");
    expect(c?.monto.toFixed(2)).toBe("156226.05");
  });

  it("subtotal remunerativo = 395.276,69", () => {
    expect(resultado.totalRemunerativo.toFixed(2)).toBe("395276.69");
  });

  it("total haberes (rem + no rem) = 656.760,04", () => {
    expect(resultado.totalRemunerativo.plus(resultado.totalNoRemunerativo).toFixed(2)).toBe("656760.04");
  });

  it("total deducciones = 128.351,31", () => {
    expect(resultado.totalDeducciones.toFixed(2)).toBe("128351.31");
  });

  it("neto = 528.408,73", () => {
    expect(resultado.neto.toFixed(2)).toBe("528408.73");
  });
});
