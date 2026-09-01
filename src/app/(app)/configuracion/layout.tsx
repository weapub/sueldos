import { ConfigNav } from "./config-nav";

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <ConfigNav />
      </div>
      {children}
    </div>
  );
}
