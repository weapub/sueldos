import { notFound } from "next/navigation";
import { obtenerEmpresa } from "@/actions/empresas";
import { db } from "@/lib/db";
import { crearEventoDesvinculacion } from "@/actions/desvinculaciones";
import { NuevaDesvinculacionForm } from "./nueva-desvinculacion-form";



export default async function NuevaDesvinculacionPage({
  params,
}: {
  params: Promise<{ empresaId: string }>;
}) {
  const { empresaId } = await params;
  const empresaResult = await obtenerEmpresa(empresaId);
  if (!empresaResult.ok) notFound();

  const legajos = await db.legajo.findMany({
    where: { empresaId, situacion: "ACTIVO" },
    orderBy: { numeroLegajo: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva desvinculación</h1>
        <p className="text-sm text-muted-foreground">{empresaResult.data.razonSocial}</p>
      </div>
      {legajos.length === 0 ? (
        <p className="text-sm text-destructive">No hay legajos activos en esta empresa.</p>
      ) : (
        <NuevaDesvinculacionForm
          empresaId={empresaId}
          legajos={legajos.map((l) => ({ id: l.id, nombre: `${l.apellido}, ${l.nombre}` }))}
          action={crearEventoDesvinculacion.bind(null, empresaId)}
        />
      )}
    </div>
  );
}
