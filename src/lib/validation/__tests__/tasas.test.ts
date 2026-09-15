import { describe, it, expect } from "vitest";
import { claveTasaValues } from "../tasas";
import { ClaveTasa } from "@/generated/prisma/enums";

/**
 * Regresión: `ANTIGUEDAD_PORCENTAJE_ANIO` existió en el enum de Prisma (y se usaba en el motor)
 * durante meses sin estar en `claveTasaValues` — rompía en silencio la pantalla de
 * Configuración → Tasas laborales para esa clave (no aparecía, no se podía editar). No hay
 * chequeo de TypeScript que detecte ese desvío (`claveTasaValues` es un array de literales, sin
 * vínculo de compilación con el enum) — este test es el único freno.
 */
describe("claveTasaValues vs enum ClaveTasa de Prisma", () => {
  it("tiene exactamente las mismas claves que el enum de Prisma, sin faltantes ni sobrantes", () => {
    const delEnum = Object.values(ClaveTasa).toSorted();
    const delArray = [...claveTasaValues].toSorted();
    expect(delArray).toEqual(delEnum);
  });
});
