import { describe, it, expect } from "vitest";
import { money } from "../money";
import { calcularAsignacionesInformativas, type EscalaRow } from "../asignaciones";

const escala: EscalaRow[] = [
  { tipo: "HIJO", zona: "GENERAL", igfDesde: money(0), igfHasta: money(1000000), monto: money(50000) },
  { tipo: "HIJO", zona: "GENERAL", igfDesde: money(1000000.01), igfHasta: money(2000000), monto: money(30000) },
  { tipo: "HIJO", zona: "GENERAL", igfDesde: money(2000000.01), igfHasta: null, monto: money(0) },
  { tipo: "HIJO_DISCAPACIDAD", zona: "GENERAL", igfDesde: money(0), igfHasta: null, monto: money(160000) },
  { tipo: "PRENATAL", zona: "GENERAL", igfDesde: money(0), igfHasta: money(2000000), monto: money(50000) },
  { tipo: "AYUDA_ESCOLAR", zona: "GENERAL", igfDesde: money(0), igfHasta: money(2000000), monto: money(80000) },
];

describe("calcularAsignacionesInformativas", () => {
  it("hijo menor: toma el tramo de IGF; hijo mayor de 18 no cuenta", () => {
    const r = calcularAsignacionesInformativas({
      familiares: [
        { vinculo: "HIJO", fechaNacimiento: new Date("2015-01-01T00:00:00Z"), enEscolaridad: true },
        { vinculo: "HIJO", fechaNacimiento: new Date("2004-01-01T00:00:00Z"), enEscolaridad: false },
      ],
      conyugeEmbarazada: false,
      igf: money(900000),
      zona: "GENERAL",
      esMesAyudaEscolar: false,
      fechaReferencia: new Date("2026-09-01T00:00:00Z"),
      escala,
    });
    const hijo = r.lineas.find((l) => l.tipo === "HIJO");
    expect(hijo?.cantidad).toBe(1);
    expect(hijo?.montoUnitario.toFixed(2)).toBe("50000.00");
    expect(r.total.toFixed(2)).toBe("50000.00");
  });

  it("IGF sobre el tope: monto 0 y warning", () => {
    const r = calcularAsignacionesInformativas({
      familiares: [{ vinculo: "HIJO", fechaNacimiento: new Date("2018-06-01T00:00:00Z"), enEscolaridad: false }],
      conyugeEmbarazada: false,
      igf: money(3000000),
      zona: "GENERAL",
      esMesAyudaEscolar: false,
      fechaReferencia: new Date("2026-09-01T00:00:00Z"),
      escala,
    });
    expect(r.lineas.find((l) => l.tipo === "HIJO")?.montoUnitario.toFixed(2)).toBe("0.00");
    expect(r.warnings.some((w) => w.includes("tope"))).toBe(true);
  });

  it("discapacidad + prenatal + ayuda escolar en marzo", () => {
    const r = calcularAsignacionesInformativas({
      familiares: [
        { vinculo: "HIJO_CON_DISCAPACIDAD", fechaNacimiento: new Date("2000-01-01T00:00:00Z"), enEscolaridad: true },
        { vinculo: "HIJO", fechaNacimiento: new Date("2016-01-01T00:00:00Z"), enEscolaridad: true },
      ],
      conyugeEmbarazada: true,
      igf: money(500000),
      zona: "GENERAL",
      esMesAyudaEscolar: true,
      fechaReferencia: new Date("2026-03-15T00:00:00Z"),
      escala,
    });
    expect(r.lineas.find((l) => l.tipo === "HIJO_DISCAPACIDAD")?.montoTotal.toFixed(2)).toBe("160000.00");
    expect(r.lineas.find((l) => l.tipo === "PRENATAL")?.montoTotal.toFixed(2)).toBe("50000.00");
    // ayuda escolar: 2 chicos en escolaridad × 80.000
    expect(r.lineas.find((l) => l.tipo === "AYUDA_ESCOLAR")?.montoTotal.toFixed(2)).toBe("160000.00");
  });
});
