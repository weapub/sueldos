import { notFound } from "next/navigation";
import { obtenerEmpresa } from "@/actions/empresas";
import { NetoBrutoForm } from "./neto-bruto-form";

export default async function NetoBrutoPage({
  params,
}: {
  params: Promise<{ empresaId: string }>;
}) {
  const { empresaId } = await params;
  const result = await obtenerEmpresa(empresaId);
  if (!result.ok) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Neto → Bruto</h1>
        <p className="text-sm text-muted-foreground">
          {result.data.razonSocial} · calcula el sueldo básico que produce un neto objetivo.
        </p>
      </div>
      {result.data.categorias.length === 0 ? (
        <p className="text-sm text-destructive">
          Cargá al menos una categoría de convenio para usar esta herramienta.
        </p>
      ) : (
        <NetoBrutoForm
          empresaId={empresaId}
          categorias={result.data.categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
        />
      )}
    </div>
  );
}
