"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { calcularYGuardarIndemnizacion, confirmarDesvinculacion } from "@/actions/desvinculaciones";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DesvinculacionActions({
  eventoId,
  estado,
  motivo,
}: {
  eventoId: string;
  estado: string;
  motivo: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (estado !== "BORRADOR") return null;

  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await calcularYGuardarIndemnizacion(eventoId);
            if (result.ok) {
              toast.success("Indemnización calculada.");
              result.data.warnings.forEach((w) => toast.warning(w));
              router.refresh();
            } else {
              toast.error(result.error);
            }
          })
        }
      >
        {pending ? "Calculando..." : "Calcular"}
      </Button>
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (motivo === "FALLECIMIENTO") {
              const confirmado = window.confirm(
                "¿Confirmar la desvinculación? Esto marca el legajo como desvinculado.",
              );
              if (!confirmado) return;
            }
            const result = await confirmarDesvinculacion(eventoId);
            if (result.ok) {
              toast.success("Desvinculación confirmada.");
              router.refresh();
            } else {
              toast.error(result.error);
            }
          })
        }
      >
        Confirmar
      </Button>
    </div>
  );
}
