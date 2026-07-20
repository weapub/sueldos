import { describe, it, expect } from "vitest";
import { money } from "../money";
import { aplicarTopeDeducciones } from "../deducciones";
import type { ConceptoInput, TasasVigentes } from "../types";

const tasas: TasasVigentes = {
  aporteJubilacion: money(0.11),
  aporteLey19032Pami: money(0.03),
  aporteObraSocial: money(0.06),
  contribJubilacion: money(0.1077),
  contribLey19032: money(0.0159),
  contribObraSocial: money(0.06),
  contribArt: money(0.03),
  contribAsigFamiliares: money(0.047),
  contribFNE: money(0.0094),
  artFfepFijo: money(0),
  svoFijo: money(0),
  contribSindical: money(0.04),
  falGrande: money(0.01),
  falPyme: money(0.025),
  topeDeduccionGeneral: money(0.2),
  topeDeduccionSindical: money(0.02),
  antiguedadPorcentajeAnio: money(0.01),
  deduccionFaecys: money(0.005),
  deduccionAporteProvincial: money(0.01),
  aporteSolidarioFijo: money(100),
    riflReduccionContribuciones: money(0),
};

function sindical(nombre: string, monto: number): ConceptoInput {
  return {
    id: nombre,
    codigo: nombre,
    nombre,
    tipo: "DEDUCCION",
    subtipo: "SINDICAL",
    monto: money(monto),
    afectaAportes: false,
    afectaContribuciones: false,
    afectaSAC: false,
    esVariable: false,
    requiereConsentimiento: false,
    consentimientoFirmado: false,
  };
}

describe("aplicarTopeDeducciones — tope sindical condicionado a afiliación (Ley 27.802 §3.6)", () => {
  it("NO afiliado: recorta las deducciones sindicales al 2% de los haberes", () => {
    const propuestas = [sindical("SINDICATO", 40000), sindical("FAECYS", 5000)]; // 45.000 = 4.5% de 1.000.000
    const resultado = aplicarTopeDeducciones(money(1000000), propuestas, tasas, false);
    // tope 2% de 1.000.000 = 20.000
    expect(resultado.totalDeducciones.toFixed(2)).toBe("20000.00");
    expect(resultado.warnings.some((w) => w.includes("recortadas"))).toBe(true);
  });

  it("afiliado: las deducciones sindicales se aplican íntegras, sin tope del 2%", () => {
    const propuestas = [sindical("SINDICATO", 40000), sindical("FAECYS", 5000)];
    const resultado = aplicarTopeDeducciones(money(1000000), propuestas, tasas, true);
    expect(resultado.totalDeducciones.toFixed(2)).toBe("45000.00");
    expect(resultado.warnings.some((w) => w.includes("recortadas"))).toBe(false);
  });

  it("afiliado: el monto íntegro sigue contando contra el tope general del 20%", () => {
    const propuestas = [
      sindical("SINDICATO", 40000),
      sindical("FAECYS", 5000),
      {
        id: "PRESTAMO",
        codigo: "PRESTAMO",
        nombre: "Préstamo",
        tipo: "DEDUCCION" as const,
        subtipo: "OTRA_DEDUCCION" as const,
        monto: money(200000),
        afectaAportes: false,
        afectaContribuciones: false,
        afectaSAC: false,
        esVariable: false,
        requiereConsentimiento: false,
        consentimientoFirmado: false,
      },
    ];
    const resultado = aplicarTopeDeducciones(money(1000000), propuestas, tasas, true);
    // tope general 20% = 200.000; sindicales sin tope = 45.000; disponible para "otras" = 155.000
    const prestamo = resultado.deducciones.find((d) => d.id === "PRESTAMO");
    expect(prestamo?.montoAjustado.toFixed(2)).toBe("155000.00");
    expect(resultado.totalDeducciones.toFixed(2)).toBe("200000.00");
  });
});
