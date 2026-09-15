import { type Money, ZERO } from "./money";
import type { Convenio, TasasVigentes } from "./types";
import {
  calcularAntiguedadImporte,
  calcularAntiguedadImporteFijo,
  calcularPresentismo,
  calcularPresentismoFlat,
} from "./convenio";

/**
 * Reglas de convenio para el motor mensual: qué fórmula usa cada convenio para antigüedad y
 * presentismo, y qué deducciones sindicales propias tiene (además de los aportes 11+3+6 %
 * comunes a todos). `resolverReglasConvenio` es la ÚNICA fuente de verdad de esto — agregar un
 * convenio nuevo significa agregar un caso acá, no tocar `mensual.ts`.
 */
export type ReglasAntiguedad =
  | { forma: "NINGUNA" }
  | { forma: "PORCENTAJE_BASICO"; tasaPorAnio: Money }
  | { forma: "MONTO_FIJO_ANIO"; montoPorAnio: Money };

export type ReglasPresentismo =
  | { forma: "NINGUNO" }
  | { forma: "FORMULA_COMERCIO" }
  | { forma: "PORCENTAJE_FLAT_BASICO"; tasa: Money };

export interface DeduccionSindicalConvenio {
  /** Código en `CONCEPTOS_SINTETICOS` (ver `src/lib/payroll/conceptosSinteticos.ts`). */
  codigoConcepto: string;
  nombre: string;
  tasa: Money;
}

export interface ReglasConvenio {
  antiguedad: ReglasAntiguedad;
  presentismo: ReglasPresentismo;
  /**
   * Deducciones sindicales propias del convenio. Comercio devuelve `[]` acá a propósito: sus
   * líneas (SINDICATO/FAECYS/aporte provincial/aporte solidario) ya están hardcodeadas en el
   * bloque 6 de `mensual.ts` y no pasan por este mecanismo, para no tocar ese camino probado.
   */
  deduccionesSindicales: DeduccionSindicalConvenio[];
}

export function resolverReglasConvenio(convenio: Convenio, tasas: TasasVigentes): ReglasConvenio {
  switch (convenio) {
    case "UECARA_660_13":
      return {
        antiguedad: { forma: "MONTO_FIJO_ANIO", montoPorAnio: tasas.antiguedadMontoFijoAnioUecara },
        presentismo: { forma: "PORCENTAJE_FLAT_BASICO", tasa: tasas.presentismoPorcentajeUecara },
        deduccionesSindicales: tasas.cuotaSindicalUecara.gt(0)
          ? [{ codigoConcepto: "30013", nombre: "Cuota sindical UECARA", tasa: tasas.cuotaSindicalUecara }]
          : [],
      };
    case "UOCRA_22_250": {
      // Ley 22.250 / CCT 76/75: el convenio no otorga adicional por antigüedad — no es un
      // "0%", es que la línea no existe en absoluto (ver `calcularMontoAntiguedadSegunReglas`,
      // caso "NINGUNA"). La indemnización por cese es un Fondo de Cese Laboral, no art. 245 —
      // eso todavía no está implementado (ver aviso en `calcularYGuardarIndemnizacion`).
      const deducciones: DeduccionSindicalConvenio[] = [];
      if (tasas.cuotaSindicalUocra.gt(0)) {
        deducciones.push({ codigoConcepto: "30014", nombre: "Cuota sindical UOCRA", tasa: tasas.cuotaSindicalUocra });
      }
      if (tasas.aporteSolidarioUocra.gt(0)) {
        deducciones.push({ codigoConcepto: "30015", nombre: "Aporte solidario UOCRA", tasa: tasas.aporteSolidarioUocra });
      }
      return {
        antiguedad: { forma: "NINGUNA" },
        presentismo: { forma: "PORCENTAJE_FLAT_BASICO", tasa: tasas.presentismoPorcentajeUocra },
        deduccionesSindicales: deducciones,
      };
    }
    case "COMERCIO_130_75":
    default:
      return {
        antiguedad: { forma: "PORCENTAJE_BASICO", tasaPorAnio: tasas.antiguedadPorcentajeAnio },
        presentismo: { forma: "FORMULA_COMERCIO" },
        deduccionesSindicales: [],
      };
  }
}

/** Aplica `ReglasAntiguedad` — usado por `mensual.ts` para no repetir el switch en cada bloque. */
export function calcularMontoAntiguedadSegunReglas(
  reglas: ReglasAntiguedad,
  base: Money,
  antiguedadAnios: number,
): Money {
  switch (reglas.forma) {
    case "NINGUNA":
      return ZERO;
    case "PORCENTAJE_BASICO":
      return calcularAntiguedadImporte(base, antiguedadAnios, reglas.tasaPorAnio);
    case "MONTO_FIJO_ANIO":
      return calcularAntiguedadImporteFijo(antiguedadAnios, reglas.montoPorAnio);
  }
}

/** Aplica `ReglasPresentismo` — usado por `mensual.ts` para no repetir el switch en cada bloque. */
export function calcularMontoPresentismoSegunReglas(
  reglas: ReglasPresentismo,
  base: Money,
  antiguedad: Money,
): Money {
  switch (reglas.forma) {
    case "NINGUNO":
      return ZERO;
    case "FORMULA_COMERCIO":
      return calcularPresentismo(base, antiguedad);
    case "PORCENTAJE_FLAT_BASICO":
      return calcularPresentismoFlat(base, reglas.tasa);
  }
}
