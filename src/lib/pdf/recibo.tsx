import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { PieChart, RUBRO_COLORS, type PieSliceInput } from "./pieChart";

/**
 * Recibo de sueldo — Anexo III, Decreto 407/2026 (vigente desde 01/06/2026). Cuatro secciones
 * obligatorias, en este orden: A) cabecera, B) costo laboral total (contribuciones patronales,
 * ANTES del bruto, con gráfico de composición), C) remuneración bruta y deducciones, D) neto.
 * Para períodos anteriores a la vigencia usar `reciboLegacy.tsx`.
 */

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 14, marginBottom: 2, fontWeight: 700 },
  subtitle: { fontSize: 9, color: "#555", marginBottom: 14 },
  sectionBlock: { marginBottom: 16 },
  sectionHeader: {
    fontSize: 10,
    fontWeight: 700,
    backgroundColor: "#1e3a8a",
    color: "#fff",
    padding: 4,
    marginBottom: 8,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  gridRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  gridItem: { width: "25%", marginBottom: 6 },
  label: { fontSize: 7, color: "#666" },
  value: { fontSize: 9 },
  tableHeader: { flexDirection: "row", borderBottom: "1 solid #999", paddingBottom: 3, marginBottom: 3 },
  tableRow: { flexDirection: "row", paddingVertical: 2 },
  colConcepto: { width: "70%" },
  colMonto: { width: "30%", textAlign: "right" },
  totales: { marginTop: 10, borderTop: "1 solid #333", paddingTop: 6 },
  netoBox: {
    marginTop: 4,
    padding: 10,
    backgroundColor: "#eff6ff",
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  netoLabel: { fontSize: 12, fontWeight: 700 },
  netoValue: { fontSize: 16, fontWeight: 700, color: "#1e3a8a" },
  costoLaboralBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 6,
    borderTop: "1 solid #ccc",
  },
  pieRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  legendRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  legendSwatch: { width: 7, height: 7, marginRight: 5 },
  legendText: { fontSize: 8 },
  footer: { marginTop: 20, borderTop: "1 solid #ccc", paddingTop: 6 },
  footerText: { fontSize: 6, color: "#888" },
});

function fmt(value: string | number) {
  return `$${Number(value).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const RUBRO_LABEL: Record<string, string> = {
  SINDICAL: "Aportes y contribuciones sindicales",
  SEGURIDAD_SOCIAL: "Seguridad Social (SIPA, FNE, Asig. Familiares)",
  OBRA_SOCIAL: "Obra Social",
  INSSJP_PAMI: "INSSJP / PAMI",
  ART: "ART",
  CAMARAS_EMPRESARIALES: "Cámaras o entidades empresariales",
  OTROS_CONVENCIONALES: "Otros rubros convencionales (SVO, FAL)",
};

export interface ReciboPdfData {
  empresa: { razonSocial: string; cuit: string; direccion?: string | null };
  legajo: {
    nombre: string;
    apellido: string;
    cuil: string;
    categoria: string;
    numeroLegajo: number;
    fechaIngreso: string;
    antiguedadAnios: number;
  };
  periodo: {
    anio: number;
    mes: number;
    fechaPago?: string | null;
    ultimoDepositoAportesPeriodo?: string | null;
    ultimoDepositoAportesBanco?: string | null;
    ultimoDepositoAportesFecha?: string | null;
  };
  diasTrabajados: number;
  conceptos: { descripcion: string; monto: string; esDeduccion: boolean }[];
  contribucionesPatronales: { descripcion: string; monto: string; rubro: string | null }[];
  totalRemunerativo: string;
  totalNoRemunerativo: string;
  totalDeducciones: string;
  totalContribucionesPatronales: string;
  neto: string;
  constancia?: { hash: string; emitidoEn: string } | null;
}

function ReciboDocument({ data }: { data: ReciboPdfData }) {
  const haberes = data.conceptos.filter((c) => !c.esDeduccion);
  const deducciones = data.conceptos.filter((c) => c.esDeduccion);

  const contribPorRubro = new Map<string, number>();
  for (const c of data.contribucionesPatronales) {
    const rubro = c.rubro ?? "OTROS_CONVENCIONALES";
    contribPorRubro.set(rubro, (contribPorRubro.get(rubro) ?? 0) + Number(c.monto));
  }

  const costoLaboralTotal = Number(data.neto) + Number(data.totalDeducciones) + Number(data.totalContribucionesPatronales);

  const pieData: PieSliceInput[] = [
    { label: "Neto al trabajador", value: Number(data.neto), color: RUBRO_COLORS.NETO },
    { label: "Aportes y deducciones retenidas", value: Number(data.totalDeducciones), color: RUBRO_COLORS.DEDUCCIONES },
    ...Array.from(contribPorRubro.entries()).map(([rubro, monto]) => ({
      label: RUBRO_LABEL[rubro] ?? rubro,
      value: monto,
      color: RUBRO_COLORS[rubro] ?? "#999999",
    })),
  ].filter((s) => s.value > 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Recibo de sueldo</Text>
        <Text style={styles.subtitle}>
          {MESES[data.periodo.mes]} {data.periodo.anio} — Anexo III, Decreto 407/2026 (Ley 27.802)
        </Text>

        {/* Sección A — Cabecera */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>A. Datos del empleador y del trabajador</Text>
          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Empleador</Text>
              <Text style={styles.value}>{data.empresa.razonSocial}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>CUIT</Text>
              <Text style={styles.value}>{data.empresa.cuit}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Domicilio</Text>
              <Text style={styles.value}>{data.empresa.direccion || "—"}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Legajo</Text>
              <Text style={styles.value}>{data.legajo.numeroLegajo}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Trabajador</Text>
              <Text style={styles.value}>
                {data.legajo.apellido}, {data.legajo.nombre}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>CUIL</Text>
              <Text style={styles.value}>{data.legajo.cuil}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Categoría</Text>
              <Text style={styles.value}>{data.legajo.categoria}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Fecha de ingreso / antigüedad</Text>
              <Text style={styles.value}>
                {data.legajo.fechaIngreso} ({data.legajo.antiguedadAnios} años)
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Días trabajados</Text>
              <Text style={styles.value}>{data.diasTrabajados}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Fecha de pago</Text>
              <Text style={styles.value}>{data.periodo.fechaPago || "—"}</Text>
            </View>
            <View style={[styles.gridItem, { width: "50%" }]}>
              <Text style={styles.label}>Depósito de cargas sociales del período anterior</Text>
              <Text style={styles.value}>
                {data.periodo.ultimoDepositoAportesPeriodo || "—"}
                {data.periodo.ultimoDepositoAportesBanco ? ` — ${data.periodo.ultimoDepositoAportesBanco}` : ""}
                {data.periodo.ultimoDepositoAportesFecha ? ` (${data.periodo.ultimoDepositoAportesFecha})` : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* Sección B — Costo laboral total, ANTES del bruto */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>B. Contribuciones patronales y costo laboral total</Text>
          <View style={styles.pieRow}>
            <PieChart data={pieData} size={100} />
            <View style={{ flex: 1 }}>
              {pieData.map((s, i) => (
                <View style={styles.legendRow} key={i}>
                  <View style={[styles.legendSwatch, { backgroundColor: s.color }]} />
                  <Text style={styles.legendText}>
                    {s.label}: {fmt(s.value)} ({((s.value / costoLaboralTotal) * 100).toFixed(1)}%)
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.costoLaboralBox}>
            <Text style={{ fontSize: 10, fontWeight: 700 }}>Costo laboral total</Text>
            <Text style={{ fontSize: 12, fontWeight: 700 }}>{fmt(costoLaboralTotal)}</Text>
          </View>
        </View>

        {/* Sección C — Remuneración bruta y deducciones */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>C. Remuneración bruta y deducciones</Text>
          <Text style={{ fontSize: 9, fontWeight: 700, marginBottom: 4 }}>Haberes</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colConcepto}>Concepto</Text>
            <Text style={styles.colMonto}>Monto</Text>
          </View>
          {haberes.map((c, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.colConcepto}>{c.descripcion}</Text>
              <Text style={styles.colMonto}>{fmt(c.monto)}</Text>
            </View>
          ))}

          <Text style={{ fontSize: 9, fontWeight: 700, marginTop: 8, marginBottom: 4 }}>Deducciones</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colConcepto}>Concepto</Text>
            <Text style={styles.colMonto}>Monto</Text>
          </View>
          {deducciones.map((c, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.colConcepto}>{c.descripcion}</Text>
              <Text style={styles.colMonto}>{fmt(c.monto)}</Text>
            </View>
          ))}

          <View style={styles.totales}>
            <View style={styles.row}>
              <Text>Total remunerativo</Text>
              <Text>{fmt(data.totalRemunerativo)}</Text>
            </View>
            <View style={styles.row}>
              <Text>Total no remunerativo</Text>
              <Text>{fmt(data.totalNoRemunerativo)}</Text>
            </View>
            <View style={styles.row}>
              <Text>Total deducciones</Text>
              <Text>{fmt(data.totalDeducciones)}</Text>
            </View>
          </View>
        </View>

        {/* Sección D — Neto */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>D. Remuneración neta</Text>
          <View style={styles.netoBox}>
            <Text style={styles.netoLabel}>Neto a cobrar</Text>
            <Text style={styles.netoValue}>{fmt(data.neto)}</Text>
          </View>
        </View>

        {data.constancia && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Constancia de emisión digital — emitido el {data.constancia.emitidoEn} — huella: {data.constancia.hash}
            </Text>
            <Text style={styles.footerText}>
              Recibo emitido y firmado digitalmente conforme Ley 27.802 / Decreto 407/2026. La entrega al trabajador
              debe acreditarse por los medios habilitados por el empleador.
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

export async function generarReciboPdf(data: ReciboPdfData): Promise<Buffer> {
  return renderToBuffer(<ReciboDocument data={data} />);
}
