import { describe, expect, it } from "vitest";
import { parsearFormula } from "../formula";

describe("parsearFormula", () => {
  it("texto sin tokens", () => {
    expect(parsearFormula("Monto fijo por período.")).toEqual([
      { tipo: "texto", texto: "Monto fijo por período." },
    ]);
  });

  it("un token en el medio", () => {
    expect(parsearFormula("Total remunerativo × {CONTRIB_SINDICAL}.")).toEqual([
      { tipo: "texto", texto: "Total remunerativo × " },
      { tipo: "tasa", clave: "CONTRIB_SINDICAL" },
      { tipo: "texto", texto: "." },
    ]);
  });

  it("varios tokens consecutivos", () => {
    expect(parsearFormula("{A} + {B}")).toEqual([
      { tipo: "tasa", clave: "A" },
      { tipo: "texto", texto: " + " },
      { tipo: "tasa", clave: "B" },
    ]);
  });

  it("token al principio y al final sin texto sobrante", () => {
    expect(parsearFormula("{SOLO}")).toEqual([{ tipo: "tasa", clave: "SOLO" }]);
  });
});
