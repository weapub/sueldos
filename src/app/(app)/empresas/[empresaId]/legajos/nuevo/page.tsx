import { notFound } from "next/navigation";
import { obtenerEmpresa } from "@/actions/empresas";
import { crearLegajo } from "@/actions/legajos";
import { procesarAltaArca } from "@/actions/altaArca";
import { NuevoLegajoCliente } from "./nuevo-legajo-cliente";

export default async function NuevoLegajoPage({
  params,
}: {
  params: Promise<{ empresaId: string }>;
}) {
  const { empresaId } = await params;
  const empresaResult = await obtenerEmpresa(empresaId);
  if (!empresaResult.ok) notFound();

  const createAction = crearLegajo.bind(null, empresaId);
  const procesarAltaAction = procesarAltaArca.bind(null, empresaId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo legajo</h1>
        <p className="text-sm text-muted-foreground">{empresaResult.data.razonSocial}</p>
      </div>
      <NuevoLegajoCliente
        empresaId={empresaId}
        categorias={empresaResult.data.categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
        ocrHabilitado={!!process.env.ANTHROPIC_API_KEY}
        crearAction={createAction}
        procesarAltaAction={procesarAltaAction}
      />
    </div>
  );
}
