import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

/**
 * Formato de recibo anterior al Anexo III del Decreto 407/2026 — se mantiene solo para
 * reimprimir recibos de períodos anteriores a su vigencia (01/06/2026). Los períodos nuevos
 * usan `recibo.tsx` (Anexo III). No modificar esta plantilla salvo corrección de un error real
 * de un recibo histórico.
 */

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 14, marginBottom: 4, fontWeight: 700 },
  subtitle: { fontSize: 10, color: "#555", marginBottom: 16 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6, borderBottom: "1 solid #ccc", paddingBottom: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  gridRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  gridItem: { width: "25%", marginBottom: 6 },
  label: { fontSize: 8, color: "#666" },
  value: { fontSize: 10 },
  tableHeader: { flexDirection: "row", borderBottom: "1 solid #999", paddingBottom: 3, marginBottom: 3 },
  tableRow: { flexDirection: "row", paddingVertical: 2 },
  colConcepto: { width: "70%" },
  colMonto: { width: "30%", textAlign: "right" },
  totales: { marginTop: 16, borderTop: "1 solid #333", paddingTop: 8 },
  netoLabel: { fontSize: 11, fontWeight: 700 },
  netoValue: { fontSize: 14, fontWeight: 700 },
});

function fmt(value: string | number) {
  return `$${Number(value).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export interface ReciboLegacyPdfData {
  empresa: { razonSocial: string; cuit: string };
  legajo: { nombre: string; apellido: string; cuil: string; categoria: string };
  periodo: { anio: number; mes: number };
  diasTrabajados: number;
  conceptos: { descripcion: string; monto: string; esDeduccion: boolean }[];
  totalRemunerativo: string;
  totalNoRemunerativo: string;
  totalDeducciones: string;
  totalContribucionesPatronales: string;
  neto: string;
}

function ReciboLegacyDocument({ data }: { data: ReciboLegacyPdfData }) {
  const haberes = data.conceptos.filter((c) => !c.esDeduccion);
  const deducciones = data.conceptos.filter((c) => c.esDeduccion);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Recibo de sueldo</Text>
        <Text style={styles.subtitle}>
          {MESES[data.periodo.mes]} {data.periodo.anio}
        </Text>

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
            <Text style={styles.label}>Categoría</Text>
            <Text style={styles.value}>{data.legajo.categoria}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Días trabajados</Text>
            <Text style={styles.value}>{data.diasTrabajados}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Haberes</Text>
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deducciones</Text>
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
        </View>

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
          <View style={styles.row}>
            <Text>Contribuciones patronales (informativo)</Text>
            <Text>{fmt(data.totalContribucionesPatronales)}</Text>
          </View>
          <View style={[styles.row, { marginTop: 8 }]}>
            <Text style={styles.netoLabel}>Neto a cobrar</Text>
            <Text style={styles.netoValue}>{fmt(data.neto)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function generarReciboLegacyPdf(data: ReciboLegacyPdfData): Promise<Buffer> {
  return renderToBuffer(<ReciboLegacyDocument data={data} />);
}
