import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerLegajo } from "@/actions/legajos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFechaAR } from "@/lib/fecha";
import { FamiliaresPanel } from "./familiares-panel";
import { GananciasLegajoPanel } from "./ganancias-legajo-panel";
import { LicenciasPanel } from "./licencias-panel";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default async function LegajoDetailPage({
  params,
}: {
  params: Promise<{ empresaId: string; legajoId: string }>;
}) {
  const { empresaId, legajoId } = await params;
  const result = await obtenerLegajo(legajoId);
  if (!result.ok) notFound();
  const legajo = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {legajo.apellido}, {legajo.nombre}
          </h1>
          <p className="text-sm text-muted-foreground">Legajo N° {legajo.numeroLegajo}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={legajo.situacion === "ACTIVO" ? "default" : "secondary"}>
            {legajo.situacion}
          </Badge>
          <Button asChild variant="secondary">
            <a href={`/api/certificado-art80/${legajoId}/pdf`} target="_blank" rel="noreferrer">
              Certificado art. 80
            </a>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/empresas/${empresaId}/legajos/${legajoId}/editar`}>Editar</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del legajo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="CUIL" value={legajo.cuil} />
          <Field
            label="Fecha de nacimiento"
            value={formatFechaAR(legajo.fechaNacimiento)}
          />
          <Field
            label="Fecha de ingreso"
            value={formatFechaAR(legajo.fechaIngreso)}
          />
          <Field label="Categoría" value={legajo.categoria.nombre} />
          <Field label="Tipo de contrato" value={legajo.tipoContrato} />
          <Field label="Modalidad" value={legajo.modalidadRemuneracion} />
          <Field
            label="Sueldo básico"
            value={`$${Number(legajo.sueldoBasico).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`}
          />
          <Field
            label="Horas semanales"
            value={
              legajo.horasSemanales
                ? `${Number(legajo.horasSemanales)} / ${Number(legajo.horasSemanalesFullTime)}`
                : `${Number(legajo.horasSemanalesFullTime)} (full-time)`
            }
          />
          <Field label="Obra social" value={legajo.obraSocial ?? "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Familiares a cargo / asignaciones familiares</CardTitle>
          <p className="text-sm text-muted-foreground">
            Informativo: ANSES paga las asignaciones directo al trabajador (SUAF), no integran el
            recibo. El cálculo estimado aparece en cada liquidación.
          </p>
        </CardHeader>
        <CardContent>
          <FamiliaresPanel
            legajoId={legajo.id}
            familiares={legajo.familiares.map((f) => ({
              id: f.id,
              nombre: f.nombre,
              vinculo: f.vinculo,
              fechaNacimiento: f.fechaNacimiento,
              enEscolaridad: f.enEscolaridad,
            }))}
            conyugeEmbarazada={legajo.conyugeEmbarazada}
            igfDeclarado={legajo.igfDeclarado != null ? String(legajo.igfDeclarado) : null}
            zonaAsignacion={legajo.zonaAsignacion}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Licencias / ausencias</CardTitle>
          <p className="text-sm text-muted-foreground">
            La liquidación descuenta del prorrateo del básico los días no pagados (sin goce, y
            los días de ART a partir del 11°).
          </p>
        </CardHeader>
        <CardContent>
          <LicenciasPanel
            legajoId={legajo.id}
            licencias={legajo.licencias.map((l) => ({
              id: l.id,
              tipo: l.tipo,
              desde: l.desde,
              hasta: l.hasta,
              conGoce: l.conGoce,
              observaciones: l.observaciones,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Impuesto a las Ganancias</CardTitle>
          <p className="text-sm text-muted-foreground">
            Opt-in por legajo. Si se activa, la liquidación calcula la retención de 4ta categoría
            (método acumulado) con los parámetros de Configuración → Ganancias.
          </p>
        </CardHeader>
        <CardContent>
          <GananciasLegajoPanel
            legajoId={legajo.id}
            config={
              legajo.gananciasConfig
                ? {
                    liquidaGanancias: legajo.gananciasConfig.liquidaGanancias,
                    computaConyuge: legajo.gananciasConfig.computaConyuge,
                    cantidadHijosACargo: legajo.gananciasConfig.cantidadHijosACargo,
                    otrasDeduccionesMensuales: String(
                      legajo.gananciasConfig.otrasDeduccionesMensuales,
                    ),
                  }
                : null
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
