"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { crearUsuario } from "@/actions/usuarios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { ActionResult } from "@/actions/empresas";

export function UsuarioForm({ empresas }: { empresas: { id: string; razonSocial: string }[] }) {
  const router = useRouter();
  const [role, setRole] = useState("ASISTENTE");
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (_prevState, formData) => crearUsuario(_prevState, formData),
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Usuario creado.");
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="grid max-w-3xl grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" minLength={8} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Rol</Label>
        <Select name="role" value={role} onValueChange={setRole}>
          <SelectTrigger id="role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CONTADOR">Contador</SelectItem>
            <SelectItem value="ASISTENTE">Asistente</SelectItem>
            <SelectItem value="CLIENTE">Cliente</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {role === "CLIENTE" && (
        <div className="col-span-2 space-y-2">
          <Label htmlFor="empresaId">Empresa vinculada</Label>
          <Select name="empresaId">
            <SelectTrigger id="empresaId" className="w-full">
              <SelectValue placeholder="Elegí una empresa" />
            </SelectTrigger>
            <SelectContent>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.razonSocial}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button type="submit" disabled={pending} className="col-span-2 w-fit">
        {pending ? "Creando..." : "Crear usuario"}
      </Button>
    </form>
  );
}
