export type FormulaSegmento = { tipo: "texto"; texto: string } | { tipo: "tasa"; clave: string };

const TOKEN_RE = /\{([A-Z0-9_]+)\}/g;

/**
 * Parsea el template de fórmula de un concepto sintético (ver `CONCEPTOS_SINTETICOS`) en
 * segmentos de texto plano y referencias a `ClaveTasa` (`{CLAVE}`), para poder renderizar
 * cada tasa como un valor vigente editable en vez de texto fijo.
 */
export function parsearFormula(template: string): FormulaSegmento[] {
  const segmentos: FormulaSegmento[] = [];
  let ultimo = 0;
  for (const match of template.matchAll(TOKEN_RE)) {
    const clave = match[1];
    const inicio = match.index ?? 0;
    if (inicio > ultimo) segmentos.push({ tipo: "texto", texto: template.slice(ultimo, inicio) });
    segmentos.push({ tipo: "tasa", clave });
    ultimo = inicio + match[0].length;
  }
  if (ultimo < template.length) segmentos.push({ tipo: "texto", texto: template.slice(ultimo) });
  return segmentos;
}
