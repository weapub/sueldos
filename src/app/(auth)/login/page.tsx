import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, oklch(0.47 0.16 264 / 12%), transparent 55%), radial-gradient(circle at 85% 80%, oklch(0.6 0.14 264 / 10%), transparent 55%)",
        }}
      />
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-sm shadow-primary/30">
            S
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Sueldos</h1>
            <p className="text-sm text-muted-foreground">
              Liquidación de haberes e indemnizaciones — Ley 27.802
            </p>
          </div>
        </div>
        <LoginForm callbackUrl={callbackUrl ?? "/dashboard"} />
      </div>
    </div>
  );
}
