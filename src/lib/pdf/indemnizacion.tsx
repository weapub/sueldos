import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 14, marginBottom: 4, fontWeight: 700 },
  subtitle: { fontSize: 10, color: "#555", marginBottom: 16 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6, borderBottom: "1 solid #ccc", paddingBottom: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  gridRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  gridItem: { width: "33%", marginBottom: 6 },
  label: { fontSize: 8, color: "#666" },
  value: { fontSize: 10 },
  totales: { marginTop: 16, borderTop: "1 solid #333", paddingTop: 8 },
  totalLabel: { fontSize: 12, fontWeight: 700 },
  totalValue: { fontSize: 15, fontWeight: 700 },
  warning: { fontSize: 8, color: "#92400e", marginBottom: 3 },
});

function fmt(value: string | number) {
  return `$${Number(value).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export interface IndemnizacionPdfData {
  empresa: { razonSocial: string; cuit: string };
  legajo: { nombre: string; apellido: string; cuil: string; fechaIngreso: string };
  motivo: string;
  fechaEgreso: string;
  art245: {
    baseArt245: string;
    antiguedadAnios: number;
    indemnizacionSinTope: string;
    topeConvenio: string;
    indemnizacionConTope: string;
    pisoGarantia67: string;
    pisoUnMes: string;
    indemnizacionFinal: string;
  };
  preaviso: { mesesPreaviso: number; montoPreaviso: string };
  beneficiarios: { nombre: string; vinculo: string; montoAsignado: string }[];
  warnings: string[];
  montoTotal: string;
}

function IndemnizacionDocument({ data }: { data: IndemnizacionPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Liquidación final — Indemnización por desvinculación</Text>
        <Text style={styles.subtitle}>Ley 27.802 — {data.motivo}</Text>

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
            <Text style={styles.label}>Fecha de ingreso</Text>
            <Text style={styles.value}>{data.legajo.fechaIngreso}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Fecha de egreso</Text>
            <Text style={styles.value}>{data.fechaEgreso}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indemnización por antigüedad (art. 245)</Text>
          <View style={styles.row}>
            <Text>Base art. 245</Text>
            <Text>{fmt(data.art245.baseArt245)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Antigüedad</Text>
            <Text>{data.art245.antiguedadAnios} año(s)</Text>
          </View>
          <View style={styles.row}>
            <Text>Monto sin tope</Text>
            <Text>{fmt(data.art245.indemnizacionSinTope)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Tope de convenio (3x)</Text>
            <Text>{fmt(data.art245.topeConvenio)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Con tope aplicado</Text>
            <Text>{fmt(data.art245.indemnizacionConTope)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Piso garantía 67%</Text>
            <Text>{fmt(data.art245.pisoGarantia67)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ fontWeight: 700 }}>Indemnización final</Text>
            <Text style={{ fontWeight: 700 }}>{fmt(data.art245.indemnizacionFinal)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preaviso (art. 231)</Text>
          <View style={styles.row}>
            <Text>Meses de preaviso</Text>
            <Text>{data.preaviso.mesesPreaviso}</Text>
          </View>
          <View style={styles.row}>
            <Text>Monto</Text>
            <Text>{fmt(data.preaviso.montoPreaviso)}</Text>
          </View>
        </View>

        {data.beneficiarios.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Distribución art. 248 (fallecimiento)</Text>
            {data.beneficiarios.map((b, i) => (
              <View style={styles.row} key={i}>
                <Text>
                  {b.nombre} ({b.vinculo})
                </Text>
                <Text>{fmt(b.montoAsignado)}</Text>
              </View>
            ))}
          </View>
        )}

        {data.warnings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Advertencias</Text>
            {data.warnings.map((w, i) => (
              <Text style={styles.warning} key={i}>
                • {w}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.totales}>
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Monto total</Text>
            <Text style={styles.totalValue}>{fmt(data.montoTotal)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function generarIndemnizacionPdf(data: IndemnizacionPdfData): Promise<Buffer> {
  return renderToBuffer(<IndemnizacionDocument data={data} />);
}
