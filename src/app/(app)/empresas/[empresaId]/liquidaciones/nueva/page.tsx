import { notFound } from "next/navigation";
import { obtenerEmpresa } from "@/actions/empresas";
import { NuevoPeriodoForm } from "./nuevo-periodo-form";

export default async function NuevoPeriodoPage({
  params,
}: {
  params: Promise<{ empresaId: string }>;
}) {
  const { empresaId } = await params;
  const empresaResult = await obtenerEmpresa(empresaId);
  if (!empresaResult.ok) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo período</h1>
        <p className="text-sm text-muted-foreground">{empresaResult.data.razonSocial}</p>
      </div>
      <NuevoPeriodoForm empresaId={empresaId} />
    </div>
  );
}
