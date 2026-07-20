import { notFound } from "next/navigation";
import { obtenerEmpresa } from "@/actions/empresas";
import { crearLegajo } from "@/actions/legajos";
import { LegajoForm } from "./legajo-form";

export default async function NuevoLegajoPage({
  params,
}: {
  params: Promise<{ empresaId: string }>;
}) {
  const { empresaId } = await params;
  const empresaResult = await obtenerEmpresa(empresaId);
  if (!empresaResult.ok) notFound();

  const createAction = crearLegajo.bind(null, empresaId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo legajo</h1>
        <p className="text-sm text-muted-foreground">{empresaResult.data.razonSocial}</p>
      </div>
      {empresaResult.data.categorias.length === 0 ? (
        <p className="text-sm text-destructive">
          Antes de cargar un legajo, cargá al menos una categoría de convenio para la empresa.
        </p>
      ) : (
        <LegajoForm
          empresaId={empresaId}
          categorias={empresaResult.data.categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
          action={createAction}
        />
      )}
    </div>
  );
}
