import { notFound } from "next/navigation";
import { obtenerEmpresa } from "@/actions/empresas";
import { obtenerLegajo, actualizarLegajo } from "@/actions/legajos";
import { LegajoForm } from "../../nuevo/legajo-form";

const ymd = (dt: Date | null | undefined): string | undefined =>
  dt ? new Date(dt).toISOString().slice(0, 10) : undefined;

export default async function EditarLegajoPage({
  params,
}: {
  params: Promise<{ empresaId: string; legajoId: string }>;
}) {
  const { empresaId, legajoId } = await params;
  const [legajoResult, empresaResult] = await Promise.all([
    obtenerLegajo(legajoId),
    obtenerEmpresa(empresaId),
  ]);
  if (!legajoResult.ok || !empresaResult.ok) notFound();
  const legajo = legajoResult.data;
  if (legajo.empresaId !== empresaId) notFound();

  const updateAction = actualizarLegajo.bind(null, legajoId, empresaId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Editar legajo — {legajo.apellido}, {legajo.nombre}
        </h1>
        <p className="text-sm text-muted-foreground">
          Legajo N° {legajo.numeroLegajo} · {empresaResult.data.razonSocial}
        </p>
      </div>
      <LegajoForm
        empresaId={empresaId}
        categorias={empresaResult.data.categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
        action={updateAction}
        modo="editar"
        defaults={{
          numeroLegajo: legajo.numeroLegajo,
          cuil: legajo.cuil,
          nombre: legajo.nombre,
          apellido: legajo.apellido,
          fechaNacimiento: ymd(legajo.fechaNacimiento),
          fechaIngreso: ymd(legajo.fechaIngreso),
          categoriaId: legajo.categoriaId,
          tipoContrato: legajo.tipoContrato,
          modalidadRemuneracion: legajo.modalidadRemuneracion,
          sueldoBasico: Number(legajo.sueldoBasico),
          horasSemanales: legajo.horasSemanales != null ? Number(legajo.horasSemanales) : null,
          horasSemanalesFullTime: Number(legajo.horasSemanalesFullTime),
          obraSocial: legajo.obraSocial ?? "",
          afiliadoSindical: legajo.afiliadoSindical,
          regimenRIFL: legajo.regimenRIFL,
          regimenRIFLFechaAlta: ymd(legajo.regimenRIFLFechaAlta) ?? null,
        }}
      />
    </div>
  );
}
