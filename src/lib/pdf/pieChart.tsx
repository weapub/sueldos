import { Svg, Path, G } from "@react-pdf/renderer";

export interface PieSliceInput {
  label: string;
  value: number;
  color: string;
}

interface PieSliceComputed extends PieSliceInput {
  path: string;
  percent: number;
}

/**
 * `@react-pdf/renderer` no soporta librerías de gráficos — dibuja el gráfico de torta a mano
 * con arcos SVG (`M`/`L`/`A`/`Z`). Ángulos en radianes, arrancando en las 12 (-90°), sentido horario.
 */
function calcularSlices(data: PieSliceInput[], cx: number, cy: number, radius: number): PieSliceComputed[] {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total <= 0) return [];

  let anguloActual = -Math.PI / 2;
  const slices: PieSliceComputed[] = [];

  for (const d of data) {
    if (d.value <= 0) continue;
    const proporcion = d.value / total;
    const anguloBarrido = proporcion * 2 * Math.PI;
    const anguloFin = anguloActual + anguloBarrido;

    const x1 = cx + radius * Math.cos(anguloActual);
    const y1 = cy + radius * Math.sin(anguloActual);
    const x2 = cx + radius * Math.cos(anguloFin);
    const y2 = cy + radius * Math.sin(anguloFin);
    const largeArcFlag = anguloBarrido > Math.PI ? 1 : 0;

    // Torta completa (una sola porción = 100%): un círculo, no un arco degenerado.
    const path =
      proporcion >= 0.999999
        ? `M ${cx},${cy - radius} A ${radius},${radius} 0 1,1 ${cx - 0.01},${cy - radius} Z`
        : `M ${cx},${cy} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;

    slices.push({ ...d, path, percent: proporcion * 100 });
    anguloActual = anguloFin;
  }

  return slices;
}

export function PieChart({
  data,
  size = 120,
}: {
  data: PieSliceInput[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 2;
  const slices = calcularSlices(data, cx, cy, radius);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <G>
        {slices.map((s, i) => (
          <Path key={i} d={s.path} fill={s.color} />
        ))}
      </G>
    </Svg>
  );
}

export const RUBRO_COLORS: Record<string, string> = {
  NETO: "#1e3a8a",
  DEDUCCIONES: "#60a5fa",
  SEGURIDAD_SOCIAL: "#059669",
  OBRA_SOCIAL: "#d97706",
  INSSJP_PAMI: "#7c3aed",
  ART: "#dc2626",
  SINDICAL: "#0891b2",
  CAMARAS_EMPRESARIALES: "#4b5563",
  OTROS_CONVENCIONALES: "#a16207",
};
