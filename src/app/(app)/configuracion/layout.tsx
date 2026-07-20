import Link from "next/link";

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <nav className="mt-2 flex gap-4 text-sm">
          <Link href="/configuracion/usuarios" className="text-primary hover:underline">
            Usuarios
          </Link>
          <Link href="/configuracion/tasas" className="text-primary hover:underline">
            Tasas laborales
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
