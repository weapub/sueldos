"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { calcularLiquidacionPeriodo, confirmarPeriodo } from "@/actions/liquidaciones";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PeriodoActions({ periodoId, estado }: { periodoId: string; estado: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (estado !== "BORRADOR") {
    return null;
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await calcularLiquidacionPeriodo(periodoId);
            if (result.ok) {
              toast.success("Período calculado.");
              if (result.data.warnings.length > 0) {
                result.data.warnings.forEach((w) => toast.warning(w));
              }
              router.refresh();
            } else {
              toast.error(result.error);
            }
          })
        }
      >
        {pending ? "Calculando..." : "Calcular período"}
      </Button>
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await confirmarPeriodo(periodoId);
            if (result.ok) {
              toast.success("Período confirmado.");
              router.refresh();
            } else {
              toast.error(result.error);
            }
          })
        }
      >
        Confirmar período
      </Button>
    </div>
  );
}
