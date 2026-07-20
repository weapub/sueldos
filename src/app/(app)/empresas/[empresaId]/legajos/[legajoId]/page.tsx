import { notFound } from "next/navigation";
import { obtenerLegajo } from "@/actions/legajos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFechaAR } from "@/lib/fecha";

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
  const { legajoId } = await params;
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
        <Badge variant={legajo.situacion === "ACTIVO" ? "default" : "secondary"}>
          {legajo.situacion}
        </Badge>
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
    </div>
  );
}
