import { describe, it, expect } from "vitest";
import { calcularDiasNoPagadosPorLicencias } from "../licencias";

describe("calcularDiasNoPagadosPorLicencias", () => {
  it("enfermedad con goce: 0 días no pagados", () => {
    const r = calcularDiasNoPagadosPorLicencias(
      [
        {
          tipo: "ENFERMEDAD_INCULPABLE",
          desde: new Date("2026-03-05T00:00:00Z"),
          hasta: new Date("2026-03-15T00:00:00Z"),
          conGoce: true,
        },
      ],
      2026,
      3,
    );
    expect(r.diasNoPagados).toBe(0);
  });

  it("suspensión sin goce: todos los días dentro del mes", () => {
    const r = calcularDiasNoPagadosPorLicencias(
      [
        {
          tipo: "SUSPENSION",
          desde: new Date("2026-03-10T00:00:00Z"),
          hasta: new Date("2026-03-14T00:00:00Z"),
          conGoce: false,
        },
      ],
      2026,
      3,
    );
    expect(r.diasNoPagados).toBe(5);
  });

  it("maternidad: no se paga; recorta al mes", () => {
    const r = calcularDiasNoPagadosPorLicencias(
      [
        {
          tipo: "MATERNIDAD",
          desde: new Date("2026-02-20T00:00:00Z"),
          hasta: new Date("2026-05-20T00:00:00Z"),
          conGoce: false,
        },
      ],
      2026,
      3,
    );
    expect(r.diasNoPagados).toBe(31); // marzo entero
  });

  it("ART: primeros 10 días los paga el empleador, del 11 en adelante la ART", () => {
    // Licencia 05/03 → 24/03 (20 días). Días 1-10 pagados, 11-20 no.
    const r = calcularDiasNoPagadosPorLicencias(
      [
        {
          tipo: "ACCIDENTE_TRABAJO",
          desde: new Date("2026-03-05T00:00:00Z"),
          hasta: new Date("2026-03-24T00:00:00Z"),
          conGoce: true,
        },
      ],
      2026,
      3,
    );
    expect(r.diasNoPagados).toBe(10);
  });

  it("ART que arranca el mes anterior: si ya pasaron los 10 días, todo el mes es de la ART", () => {
    const r = calcularDiasNoPagadosPorLicencias(
      [
        {
          tipo: "ACCIDENTE_TRABAJO",
          desde: new Date("2026-02-15T00:00:00Z"),
          hasta: new Date("2026-03-20T00:00:00Z"),
          conGoce: true,
        },
      ],
      2026,
      3,
    );
    expect(r.diasNoPagados).toBe(20); // todo el tramo de marzo
  });
});
