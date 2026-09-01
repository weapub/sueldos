"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { eliminarEscalaAsignacion } from "@/actions/asignaciones";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function EliminarFilaButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label="Eliminar fila"
      onClick={() =>
        startTransition(async () => {
          const res = await eliminarEscalaAsignacion(id);
          if (res.ok) {
            toast.success("Fila eliminada.");
            router.refresh();
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
