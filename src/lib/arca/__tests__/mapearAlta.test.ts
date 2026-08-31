import { describe, it, expect } from "vitest";
import {
  formatCuit,
  mapearAltaALegajo,
  mapearAltaAEmpresa,
  matchCategoria,
  diffEmpresa,
} from "@/lib/arca/mapearAlta";
import type { AltaArcaExtraida } from "@/lib/arca/schema";

// Fixture calcado de la foto de ejemplo del alta de ARCA.
const alta: AltaArcaExtraida = {
  empleadorCuit: "23-14254108-4",
  empleadorRazonSocial: "ALIANA PAREDES",
  empleadoApellido: "REJALA",
  empleadoNombres: "LUCAS ALEJANDRO",
  empleadoApellidoNombreCrudo: "REJALA LUCAS ALEJANDRO",
  empleadoCuil: "20-41268735-4",
  fechaInicio: "2026-08-24",
  fechaCese: "",
  obraSocialCodigo: "125707",
  obraSocialNombre: "O.S. DEL PERSONAL CIVIL DE LA NACION",
  modalidadContratoCodigo: "008",
  modalidadContratoDescripcion: "A tiempo completo indeterminado/Trabajo permanente",
  situacionRevistaCodigo: "01",
  regimen: "SIPA",
  convenioCodigo: "0130/75",
  convenioDescripcion: "COMERCIO",
  categoriaCodigo: "007511",
  categoriaDescripcion: "CATEGORIA A - MAESTRANZA Y SERVICIOS",
  puestoCodigo: "5220",
  puestoDescripcion: "Vendedores y demostradores de tiendas y almacenes",
  remuneracionPactada: 1300000,
  modalidadLiquidacion: "1 - MES",
  domicilioExplotacion: "SENADOR EMILIO JUAN JOSE TOMAS 1807",
  codigoPostal: "3600",
  localidad: "FORMOSA",
  provincia: "FORMOSA",
  actividadEconomicaCodigo: "472112",
  actividadEconomicaDescripcion: "VENTA AL POR MENOR DE FIAMBRES Y EMBUTIDOS",
};

describe("formatCuit", () => {
  it("normaliza 11 dígitos a NN-NNNNNNNN-N", () => {
    expect(formatCuit("23142541084")).toBe("23-14254108-4");
    expect(formatCuit("23-14254108-4")).toBe("23-14254108-4");
  });
  it("devuelve el original si no tiene 11 dígitos", () => {
    expect(formatCuit("123")).toBe("123");
  });
  it("tolera null/vacío", () => {
    expect(formatCuit(null)).toBeUndefined();
    expect(formatCuit("  ")).toBeUndefined();
  });
});

describe("mapearAltaALegajo", () => {
  const legajo = mapearAltaALegajo(alta);

  it("mapea identidad y fecha de ingreso", () => {
    expect(legajo.cuil).toBe("20-41268735-4");
    expect(legajo.apellido).toBe("REJALA");
    expect(legajo.nombre).toBe("LUCAS ALEJANDRO");
    expect(legajo.fechaIngreso).toBe("2026-08-24");
  });

  it("mapea sueldo, tipo de contrato y modalidad", () => {
    expect(legajo.sueldoBasico).toBe("1300000");
    expect(legajo.tipoContrato).toBe("TIEMPO_INDETERMINADO");
    expect(legajo.modalidadRemuneracion).toBe("MENSUAL");
    expect(legajo.obraSocial).toBe("O.S. DEL PERSONAL CIVIL DE LA NACION");
  });

  it("parte el campo crudo cuando faltan apellido/nombres", () => {
    const l = mapearAltaALegajo({
      ...alta,
      empleadoApellido: "",
      empleadoNombres: "",
    });
    expect(l.apellido).toBe("REJALA");
    expect(l.nombre).toBe("LUCAS ALEJANDRO");
  });

  it("ignora fecha con formato inválido y remuneración no positiva", () => {
    const l = mapearAltaALegajo({ ...alta, fechaInicio: "24/08/2026", remuneracionPactada: 0 });
    expect(l.fechaIngreso).toBeUndefined();
    expect(l.sueldoBasico).toBeUndefined();
  });

  it("mapea códigos de modalidad de contrato part-time y plazo fijo", () => {
    expect(mapearAltaALegajo({ ...alta, modalidadContratoCodigo: "009" }).tipoContrato).toBe(
      "PART_TIME",
    );
    expect(mapearAltaALegajo({ ...alta, modalidadContratoCodigo: "010" }).tipoContrato).toBe(
      "PLAZO_FIJO",
    );
  });
});

describe("mapearAltaAEmpresa", () => {
  const empresa = mapearAltaAEmpresa(alta);

  it("compone los campos de la empresa", () => {
    expect(empresa.cuit).toBe("23-14254108-4");
    expect(empresa.razonSocial).toBe("ALIANA PAREDES");
    expect(empresa.actividad).toBe("472112 - VENTA AL POR MENOR DE FIAMBRES Y EMBUTIDOS");
    expect(empresa.provincia).toBe("FORMOSA");
    expect(empresa.direccion).toBe("SENADOR EMILIO JUAN JOSE TOMAS 1807, CP 3600");
  });
});

describe("matchCategoria", () => {
  it("matchea por nombre normalizado (acentos/mayúsculas/puntuación)", () => {
    expect(
      matchCategoria(alta, [{ id: "c1", nombre: "Categoria A - Maestranza y Servicios" }]),
    ).toBe("c1");
  });
  it("devuelve null si no hay coincidencia", () => {
    expect(matchCategoria(alta, [{ id: "c2", nombre: "Vendedor B" }])).toBeNull();
  });
  it("devuelve null si el alta no trae categoría", () => {
    expect(
      matchCategoria(
        { ...alta, categoriaDescripcion: "", categoriaCodigo: "" },
        [{ id: "c1", nombre: "Categoria A - Maestranza y Servicios" }],
      ),
    ).toBeNull();
  });
});

describe("diffEmpresa", () => {
  it("lista solo los campos detectados que difieren", () => {
    const cambios = diffEmpresa(
      { razonSocial: "", cuit: "", actividad: "", provincia: "", direccion: null },
      mapearAltaAEmpresa(alta),
    );
    expect(cambios.map((c) => c.campo).sort()).toEqual(
      ["actividad", "cuit", "direccion", "provincia", "razonSocial"].sort(),
    );
  });

  it("omite los campos que ya coinciden (ignorando mayúsculas/espacios)", () => {
    const cambios = diffEmpresa(
      {
        razonSocial: "aliana  paredes",
        cuit: "23-14254108-4",
        actividad: "472112 - VENTA AL POR MENOR DE FIAMBRES Y EMBUTIDOS",
        provincia: "Formosa",
        direccion: "SENADOR EMILIO JUAN JOSE TOMAS 1807, CP 3600",
      },
      mapearAltaAEmpresa(alta),
    );
    expect(cambios).toEqual([]);
  });
});
