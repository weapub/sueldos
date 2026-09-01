export type CategoriaPreset = {
  nombre: string;
  convenioNombre: string;
  salarioBaseConvenio: number;
  /** No remunerativo de escala (suma fija de acuerdo). 0 cuando ya está consolidado en el básico. */
  remuneracionNoRemunerativa: number;
  vigenciaDesde: string; // yyyy-mm-dd
};

// Escala salarial FAECYS — CCT 130/75 (Empleados de Comercio), Rama Gremial.
// Acuerdo paritario 04/2026 (firmado 26/03/2026, Circular FAECYS 07/04/2026).
// Vigencia del acuerdo: abril a julio 2026. Se toman los valores de JULIO/2026, donde
// las sumas no remunerativas de los acuerdos 06 y 12/2025 y 04/2026 quedaron
// consolidadas en el BÁSICO (columnas "AUM NO REM" = 0), por lo que
// `remuneracionNoRemunerativa` = 0 y `salarioBaseConvenio` = TOTAL de la escala.
// Fuente verificada contra el PDF oficial. No modificar montos sin una fuente real:
// un tope de art. 245 inventado deriva en una indemnización mal calculada.
const VIGENCIA = "2026-07-01";

function preset(nombre: string, salarioBaseConvenio: number): CategoriaPreset {
  return {
    nombre,
    convenioNombre: "CCT 130/75",
    salarioBaseConvenio,
    remuneracionNoRemunerativa: 0,
    vigenciaDesde: VIGENCIA,
  };
}

export const CATALOGO_CCT_130_75: CategoriaPreset[] = [
  // Maestranza y Servicios
  preset("Maestranza y Servicios A", 1233585),
  preset("Maestranza y Servicios B", 1236794),
  preset("Maestranza y Servicios C", 1248038),
  // Administrativo
  preset("Administrativo A", 1245631),
  preset("Administrativo B", 1250454),
  preset("Administrativo C", 1255270),
  preset("Administrativo D", 1269729),
  preset("Administrativo E", 1281775),
  preset("Administrativo F", 1299445),
  // Cajeros
  preset("Cajero A", 1249646),
  preset("Cajero B", 1255270),
  preset("Cajero C", 1262499),
  // Personal Auxiliar
  preset("Auxiliar A", 1249646),
  preset("Auxiliar B", 1257677),
  preset("Auxiliar C", 1284184),
  // Auxiliar Especializado
  preset("Auxiliar Especializado A", 1259287),
  preset("Auxiliar Especializado B", 1273743),
  // Vendedores
  preset("Vendedor A", 1249646),
  preset("Vendedor B", 1273746),
  preset("Vendedor C", 1281775),
  preset("Vendedor D", 1299445),
];
