import { describe, it, expect } from "vitest";
import {
  CONCEPTOS_SINTETICOS,
  CODIGOS_SINTETICOS,
  conceptoSinteticoPorCodigo,
} from "@/lib/payroll/conceptosSinteticos";

describe("CONCEPTOS_SINTETICOS", () => {
  it("no tiene códigos duplicados", () => {
    expect(new Set(CODIGOS_SINTETICOS).size).toBe(CODIGOS_SINTETICOS.length);
  });

  it("incluye todos los códigos que puede emitir el motor de liquidación", () => {
    // Espejo del set que produce `calcularLiquidacionMensual`. Si el motor agrega un
    // concepto nuevo, este test obliga a registrarlo acá (si no, la persistencia lo
    // rechaza en vez de descartarlo en silencio).
    const emitidosPorElMotor = [
      "BASICO", "SAC", "SAC_NR", "10002", "10003", "20001", "20002", "20003",
      "APORTES", "30004", "30005", "30006", "30007", "30008", "30009", "30010",
      "CP_JUBILACION", "CP_LEY19032", "CP_OBRA_SOCIAL", "CP_ASIG_FAMILIARES",
      "CP_FNE", "CP_ART", "CP_SVO",
    ];
    for (const codigo of emitidosPorElMotor) {
      expect(conceptoSinteticoPorCodigo(codigo), `falta el concepto sintético ${codigo}`).toBeDefined();
    }
  });

  it("la deducción IPS FSA (30010) está registrada como DEDUCCION", () => {
    const ips = conceptoSinteticoPorCodigo("30010");
    expect(ips?.nombre).toBe("IPS FSA");
    expect(ips?.tipo).toBe("DEDUCCION");
  });

  it("las contribuciones patronales tienen rubro de recibo", () => {
    for (const c of CONCEPTOS_SINTETICOS.filter((x) => x.tipo === "CONTRIBUCION_PATRONAL")) {
      expect(c.rubroRecibo, `${c.codigo} sin rubroRecibo`).toBeTruthy();
    }
  });
});
