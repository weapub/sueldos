import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { PieChart, RUBRO_COLORS, type PieSliceInput } from "./pieChart";

/**
 * Recibo de sueldo — Anexo III, Decreto 407/2026 (vigente desde 01/06/2026). Cuatro secciones
 * obligatorias, en este orden: A) cabecera, B) costo laboral total (contribuciones patronales,
 * ANTES del bruto, con gráfico de composición), C) remuneración bruta y deducciones, D) neto.
 * Para períodos anteriores a la vigencia usar `reciboLegacy.tsx`.
 *
 * Se emite "por duplicado" (art. 140 LCT) en una sola hoja A4: mitad superior = original para
 * el empleador (con línea de firma del trabajador), mitad inferior = duplicado para el empleado.
 */

const styles = StyleSheet.create({
  page: { padding: 8, fontSize: 5.5, fontFamily: "Helvetica" },
  mitad: { height: "49%", border: "1 solid #999", borderRadius: 3, padding: 5 },
  separador: {
    height: "2%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  separadorTexto: { fontSize: 5.5, color: "#999" },
  etiquetaCopia: {
    fontSize: 6.5,
    fontWeight: 700,
    color: "#1e3a8a",
    marginBottom: 1,
    textTransform: "uppercase",
  },
  title: { fontSize: 8, marginBottom: 0.5, fontWeight: 700 },
  subtitle: { fontSize: 5.5, color: "#555", marginBottom: 2 },
  sectionBlock: { marginBottom: 2 },
  sectionHeader: {
    fontSize: 6,
    fontWeight: 700,
    backgroundColor: "#1e3a8a",
    color: "#fff",
    padding: 1.5,
    marginBottom: 1.5,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 0.5 },
  gridRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 0.5 },
  gridItem: { width: "25%", marginBottom: 1 },
  label: { fontSize: 4.2, color: "#666" },
  value: { fontSize: 5.5 },
  tableHeader: { flexDirection: "row", borderBottom: "0.5 solid #999", paddingBottom: 0.5, marginBottom: 0.5 },
  tableRow: { flexDirection: "row", paddingVertical: 0.3 },
  colConcepto: { width: "70%" },
  colMonto: { width: "30%", textAlign: "right" },
  totales: { marginTop: 1.5, borderTop: "0.5 solid #333", paddingTop: 1 },
  netoBox: {
    marginTop: 1,
    padding: 2.5,
    backgroundColor: "#eff6ff",
    borderRadius: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  netoLabel: { fontSize: 6.5, fontWeight: 700 },
  netoValue: { fontSize: 8, fontWeight: 700, color: "#1e3a8a" },
  costoLaboralBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 1,
    paddingTop: 1,
    borderTop: "0.5 solid #ccc",
  },
  pieRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendRow: { flexDirection: "row", alignItems: "center", marginBottom: 0.5 },
  legendSwatch: { width: 3.5, height: 3.5, marginRight: 2.5 },
  legendText: { fontSize: 4.2 },
  firmaBox: { marginTop: 2, flexDirection: "row", justifyContent: "space-between" },
  firmaLinea: { width: "45%", borderTop: "0.5 solid #333", paddingTop: 1, fontSize: 4.2, textAlign: "center" },
  footer: { marginTop: 2, borderTop: "0.5 solid #ccc", paddingTop: 1 },
  footerText: { fontSize: 3.5, color: "#888" },
});

function fmt(value: string | number) {
  return `$${Number(value).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const RUBRO_LABEL: Record<string, string> = {
  SINDICAL: "Aportes y contrib. sindicales",
  SEGURIDAD_SOCIAL: "Seguridad Social (SIPA, FNE, Asig. Fliares.)",
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

function ReciboMitad({
  data,
  etiqueta,
  mostrarFirma,
}: {
  data: ReciboPdfData;
  etiqueta: string;
  mostrarFirma: boolean;
}) {
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
    <View style={styles.mitad} wrap={false}>
      <Text style={styles.etiquetaCopia}>{etiqueta}</Text>
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
            <Text style={styles.label}>Ingreso / antigüedad</Text>
            <Text style={styles.value}>
              {data.legajo.fechaIngreso} ({data.legajo.antiguedadAnios}a)
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
            <Text style={styles.label}>Depósito cargas sociales período anterior</Text>
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
          <PieChart data={pieData} size={40} />
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
          <Text style={{ fontSize: 6, fontWeight: 700 }}>Costo laboral total</Text>
          <Text style={{ fontSize: 7, fontWeight: 700 }}>{fmt(costoLaboralTotal)}</Text>
        </View>
      </View>

      {/* Sección C — Remuneración bruta y deducciones */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionHeader}>C. Remuneración bruta y deducciones</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.colConcepto}>Concepto</Text>
          <Text style={styles.colMonto}>Monto</Text>
        </View>
        <Text style={{ fontSize: 4.8, fontWeight: 700, marginTop: 0.5 }}>Haberes</Text>
        {haberes.map((c, i) => (
          <View style={styles.tableRow} key={i}>
            <Text style={styles.colConcepto}>{c.descripcion}</Text>
            <Text style={styles.colMonto}>{fmt(c.monto)}</Text>
          </View>
        ))}

        <Text style={{ fontSize: 4.8, fontWeight: 700, marginTop: 1 }}>Deducciones</Text>
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

      {mostrarFirma && (
        <View style={styles.firmaBox}>
          <Text style={styles.firmaLinea}>Firma del trabajador (recibí conforme)</Text>
          <Text style={styles.firmaLinea}>Aclaración y fecha</Text>
        </View>
      )}

      {data.constancia && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Constancia de emisión digital — {data.constancia.emitidoEn} — huella: {data.constancia.hash}
          </Text>
          <Text style={styles.footerText}>
            Recibo emitido y firmado digitalmente conforme Ley 27.802 / Decreto 407/2026.
          </Text>
        </View>
      )}
    </View>
  );
}

function ReciboDocument({ data }: { data: ReciboPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReciboMitad data={data} etiqueta="Original para el empleador" mostrarFirma />
        <View style={styles.separador}>
          <Text style={styles.separadorTexto}>✂ — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — —</Text>
        </View>
        <ReciboMitad data={data} etiqueta="Duplicado para el empleado" mostrarFirma={false} />
      </Page>
    </Document>
  );
}

export async function generarReciboPdf(data: ReciboPdfData): Promise<Buffer> {
  return renderToBuffer(<ReciboDocument data={data} />);
}
