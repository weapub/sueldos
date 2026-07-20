import { describe, it, expect } from "vitest";
import { money } from "../money";
import { formatSicossFile } from "../sicoss";

describe("formatSicossFile", () => {
  it("genera una línea de ancho fijo con las posiciones esperadas", () => {
    const file = formatSicossFile([
      {
        cuil: "27-30123456-4",
        apellidoNombre: "García, Ana",
        cuitEmpleador: "30-71234567-8",
        anio: 2026,
        mes: 7,
        codigoModalidad: "01",
        obraSocial: "OSDE",
        remuneracionTotal: money(1000000),
        remuneracionImponible1: money(950000),
        diasTrabajados: 31,
      },
    ]);

    const linea = file.split("\r\n")[0];
    expect(linea.slice(0, 11)).toBe("27301234564");
    expect(linea.slice(11, 41)).toBe("GARCÍA, ANA" + " ".repeat(19));
    expect(linea.slice(41, 52)).toBe("30712345678");
    expect(linea.slice(52, 58)).toBe("202607");
    expect(linea.slice(58, 60)).toBe("01");
    expect(linea.slice(60, 66)).toBe("OSDE  ");
    // remuneración total en centavos, 12 dígitos: 1,000,000.00 -> 100000000
    expect(linea.slice(66, 78)).toBe("000100000000");
    expect(linea.slice(78, 90)).toBe("000095000000");
    expect(linea.slice(90, 92)).toBe("31");
  });

  it("trunca nombres largos y no rompe el ancho fijo", () => {
    const file = formatSicossFile([
      {
        cuil: "20123456789",
        apellidoNombre: "Un Apellido Compuesto Muy Pero Muy Largo, Nombre",
        cuitEmpleador: "30712345678",
        anio: 2026,
        mes: 12,
        codigoModalidad: "01",
        obraSocial: "OSDE",
        remuneracionTotal: money(500000),
        remuneracionImponible1: money(500000),
        diasTrabajados: 30,
      },
    ]);
    const linea = file.split("\r\n")[0];
    expect(linea.slice(11, 41)).toHaveLength(30);
  });
});
