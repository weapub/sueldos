export type CategoriaPreset = {
  nombre: string;
  convenioNombre: string;
  salarioBaseConvenio: number;
  vigenciaDesde: string; // yyyy-mm-dd
};

// Valores verificados contra la escala real (MAYO'24, GONZALEZ.xlsm — caso de regresión
// GONZALEZ IVAN). No agregar categorías/montos sin verificarlos contra una fuente real:
// un tope de art. 245 inventado puede derivar en una indemnización mal calculada.
export const CATALOGO_CCT_130_75: CategoriaPreset[] = [
  {
    nombre: "Administrativo A",
    convenioNombre: "CCT 130/75",
    salarioBaseConvenio: 445901.43,
    vigenciaDesde: "2026-01-01",
  },
  {
    nombre: "Vendedor B",
    convenioNombre: "CCT 130/75",
    salarioBaseConvenio: 457088.37,
    vigenciaDesde: "2026-01-01",
  },
];
