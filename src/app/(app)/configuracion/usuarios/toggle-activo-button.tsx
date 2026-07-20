"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { actualizarUsuario } from "@/actions/usuarios";
import { toast } from "sonner";

export function ToggleActivoButton({ usuarioId, activo }: { usuarioId: string; activo: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await actualizarUsuario(usuarioId, { activo: !activo });
          if (result.ok) {
            router.refresh();
          } else {
            toast.error(result.error);
          }
        })
      }
    >
      {activo ? "Desactivar" : "Activar"}
    </Button>
  );
}
