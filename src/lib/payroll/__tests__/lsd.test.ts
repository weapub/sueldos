import { describe, it, expect } from "vitest";
import { money } from "../money";
import {
  formatRegistro01,
  formatRegistro02,
  formatRegistro03,
  formatRegistro04,
  formatRegistro05,
  formatLsdFile,
} from "../lsd";

describe("Registro 02 — ancho verificado contra GONZALEZ.xlsm (control de largo = 115)", () => {
  it("genera exactamente 115 posiciones", () => {
    const linea = formatRegistro02({
      cuil: "20-37324841-0",
      legajo: "1",
      dependenciaRevista: "VENDEDOR B",
      fechaPago: new Date("2024-07-05"),
      formaPago: 3,
    });
    expect(linea).toHaveLength(115);
    expect(linea.startsWith("02")).toBe(true);
    expect(linea.slice(2, 13)).toBe("20373248410");
  });
});

describe("Registro 03 — ancho verificado contra GONZALEZ.xlsm (control de largo = 51)", () => {
  it("genera exactamente 51 posiciones, con cantidad e importe multiplicados x100", () => {
    const linea = formatRegistro03({
      cuil: "20-37324841-0",
      codigoConcepto: "10001",
      cantidad: money(31),
      importe: money("228544.185"),
      debitoCredito: "C",
    });
    expect(linea).toHaveLength(51);
    expect(linea.slice(0, 2)).toBe("03");
    expect(linea.slice(2, 13)).toBe("20373248410");
    // codigoConcepto (10) + cantidad x100 a 5 dígitos ("31" -> 3100 -> "03100")
    expect(linea.slice(13, 23)).toBe("10001     ");
    expect(linea.slice(23, 28)).toBe("03100");
  });
});

describe("Registro 05 — ancho verificado contra GONZALEZ.xlsm (control de largo = 65)", () => {
  it("genera exactamente 65 posiciones", () => {
    const linea = formatRegistro05({
      cuil: "20-37324841-0",
      categoriaProfesional: "1",
      puestoDesempenado: "1",
      fechaIngreso: new Date("2023-07-01"),
      remuneracion: money(100000),
      cuitEmpleador: "23-14254108-4",
    });
    expect(linea).toHaveLength(65);
    expect(linea.slice(0, 2)).toBe("05");
  });
});

describe("Registro 01 — inferido (sin fórmula fuente para verificar el ancho exacto)", () => {
  it("arranca con el identificador fijo '01' y usa período AAAAMM", () => {
    const linea = formatRegistro01({
      cuitEmpleador: "23-14254108-4",
      identificacionEnvio: "ENVIO1",
      anio: 2026,
      mes: 12,
      tipoLiquidacion: "M",
      numeroLiquidacion: "1",
      diasBase: 31,
      cantidadRegistros04: 5,
    });
    expect(linea.slice(0, 2)).toBe("01");
    expect(linea.slice(2, 13)).toBe("23142541084");
  });
});

describe("Registro 04 — reconstruido con mejor esfuerzo, campos no relevados en 0", () => {
  it("no lanza y produce una línea con el identificador correcto", () => {
    const linea = formatRegistro04({
      cuil: "20-37324841-0",
      conyuge: false,
      cantidadHijos: 0,
      marcaCCT: true,
      marcaSCVO: true,
      marcaCorrespondeReduccion: false,
      tipoEmpresa: 1,
      codigoSituacion: 1,
      codigoCondicion: 1,
      codigoActividad: 1,
      codigoModalidadContratacion: 1,
      codigoSiniestrado: 0,
      codigoLocalidad: 34,
      cantDiasTrabajados: 30,
      horasTrabajadas: 0,
      codigoObraSocial: "119302",
      remuneracionBruta: money("617062.36"),
      basesImponibles: [money("371384.30"), money("371384.30"), money("371384.30"), money("617062.36"), money("371384.30"), money(0), money(0), money("617062.36"), money("617062.36")],
      baseImponible10: money("367882.46"),
      importeADetraer: money("3501.84"),
    });
    expect(linea.slice(0, 2)).toBe("04");
    expect(linea.slice(2, 13)).toBe("20373248410");
  });
});

describe("formatLsdFile — orden fijo de registros", () => {
  it("concatena 01, luego todos los 02, 03, 04, 05 en ese orden", () => {
    const archivo = formatLsdFile({
      registro01: {
        cuitEmpleador: "23-14254108-4",
        identificacionEnvio: "E1",
        anio: 2026,
        mes: 12,
        tipoLiquidacion: "M",
        numeroLiquidacion: "1",
        diasBase: 31,
        cantidadRegistros04: 1,
      },
      registros02: [{ cuil: "20-37324841-0", fechaPago: new Date("2026-12-05"), formaPago: 3 }],
      registros03: [
        { cuil: "20-37324841-0", codigoConcepto: "10001", cantidad: money(31), importe: money(100000), debitoCredito: "C" },
      ],
      registros04: [
        {
          cuil: "20-37324841-0",
          conyuge: false,
          cantidadHijos: 0,
          marcaCCT: true,
          marcaSCVO: true,
          marcaCorrespondeReduccion: false,
          tipoEmpresa: 1,
          codigoSituacion: 1,
          codigoCondicion: 1,
          codigoActividad: 1,
          codigoModalidadContratacion: 1,
          codigoSiniestrado: 0,
          codigoLocalidad: 34,
          cantDiasTrabajados: 31,
          horasTrabajadas: 0,
          codigoObraSocial: "119302",
          remuneracionBruta: money(100000),
          basesImponibles: [money(100000), money(100000), money(100000), money(100000), money(100000), money(0), money(0), money(100000), money(100000)],
          baseImponible10: money(100000),
          importeADetraer: money(0),
        },
      ],
    });
    const lineas = archivo.trim().split("\r\n");
    expect(lineas).toHaveLength(4);
    expect(lineas[0].startsWith("01")).toBe(true);
    expect(lineas[1].startsWith("02")).toBe(true);
    expect(lineas[2].startsWith("03")).toBe(true);
    expect(lineas[3].startsWith("04")).toBe(true);
  });
});
