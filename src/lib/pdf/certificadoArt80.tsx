import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

/**
 * Certificación de servicios y remuneraciones / certificado de trabajo (art. 80 LCT).
 * Borrador para revisión y firma del empleador. El sistema no verifica el depósito real de
 * aportes y contribuciones — se deja constancia de lo retenido/calculado.
 */

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", lineHeight: 1.5 },
  title: { fontSize: 13, fontWeight: 700, textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 9, textAlign: "center", color: "#555", marginBottom: 16 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: 700, marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  th: { flexDirection: "row", borderBottom: "1 solid #999", paddingBottom: 2, marginBottom: 2, fontWeight: 700 },
  td: { flexDirection: "row", paddingVertical: 1 },
  cPeriodo: { width: "40%" },
  cMonto: { width: "30%", textAlign: "right" },
  cTipo: { width: "30%", textAlign: "right" },
  nota: { fontSize: 7.5, color: "#777", marginTop: 20 },
  firma: { marginTop: 40, borderTop: "1 solid #333", width: "50%", paddingTop: 4, fontSize: 8 },
});

function fmt(v: string | number) {
  return `$${Number(v).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export interface CertificadoArt80Data {
  empresa: { razonSocial: string; cuit: string; direccion: string | null };
  legajo: {
    nombre: string;
    apellido: string;
    cuil: string;
    categoria: string;
    fechaIngreso: string;
    fechaEgreso: string | null;
    antiguedad: string;
  };
  remuneraciones: { periodo: string; remunerativo: string; noRemunerativo: string; aportes: string }[];
  emitidoEn: string;
}

function CertificadoDocument({ data }: { data: CertificadoArt80Data }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Certificación de servicios y remuneraciones</Text>
        <Text style={styles.subtitle}>Art. 80, Ley de Contrato de Trabajo 20.744 — borrador</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Empleador</Text>
          <View style={styles.row}>
            <Text>Razón social</Text>
            <Text>{data.empresa.razonSocial}</Text>
          </View>
          <View style={styles.row}>
            <Text>CUIT</Text>
            <Text>{data.empresa.cuit}</Text>
          </View>
          <View style={styles.row}>
            <Text>Domicilio</Text>
            <Text>{data.empresa.direccion ?? "—"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trabajador</Text>
          <View style={styles.row}>
            <Text>Apellido y nombre</Text>
            <Text>
              {data.legajo.apellido}, {data.legajo.nombre}
            </Text>
          </View>
          <View style={styles.row}>
            <Text>CUIL</Text>
            <Text>{data.legajo.cuil}</Text>
          </View>
          <View style={styles.row}>
            <Text>Categoría / calificación profesional</Text>
            <Text>{data.legajo.categoria}</Text>
          </View>
          <View style={styles.row}>
            <Text>Fecha de ingreso</Text>
            <Text>{data.legajo.fechaIngreso}</Text>
          </View>
          <View style={styles.row}>
            <Text>Fecha de egreso</Text>
            <Text>{data.legajo.fechaEgreso ?? "continúa"}</Text>
          </View>
          <View style={styles.row}>
            <Text>Antigüedad</Text>
            <Text>{data.legajo.antiguedad}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Remuneraciones y aportes retenidos</Text>
          <View style={styles.th}>
            <Text style={styles.cPeriodo}>Período</Text>
            <Text style={styles.cMonto}>Remuneración</Text>
            <Text style={styles.cTipo}>Aportes retenidos</Text>
          </View>
          {data.remuneraciones.map((r, i) => (
            <View style={styles.td} key={i}>
              <Text style={styles.cPeriodo}>{r.periodo}</Text>
              <Text style={styles.cMonto}>
                {fmt(Number(r.remunerativo) + Number(r.noRemunerativo))}
              </Text>
              <Text style={styles.cTipo}>{fmt(r.aportes)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.nota}>
          Se deja constancia de que los aportes y contribuciones fueron retenidos e imputados
          según las liquidaciones del período. La verificación del efectivo ingreso ante ARCA se
          realiza a través de &ldquo;Aportes en Línea&rdquo;. Documento generado el{" "}
          {data.emitidoEn} — sujeto a revisión y firma del empleador.
        </Text>

        <Text style={styles.firma}>Firma y sello del empleador</Text>
      </Page>
    </Document>
  );
}

export async function generarCertificadoArt80Pdf(data: CertificadoArt80Data): Promise<Buffer> {
  return renderToBuffer(<CertificadoDocument data={data} />);
}
