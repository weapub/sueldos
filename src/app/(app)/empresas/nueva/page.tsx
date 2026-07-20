import { crearEmpresa } from "@/actions/empresas";
import { EmpresaForm } from "../empresa-form";

export default function NuevaEmpresaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva empresa</h1>
        <p className="text-sm text-muted-foreground">Alta de un nuevo cliente del estudio.</p>
      </div>
      <EmpresaForm action={crearEmpresa} redirectOnSuccess={(r) => (r.ok ? `/empresas/${r.data.id}` : "/empresas")} />
    </div>
  );
}
