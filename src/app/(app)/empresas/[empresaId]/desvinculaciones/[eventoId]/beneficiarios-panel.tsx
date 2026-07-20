"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { agregarBeneficiario } from "@/actions/desvinculaciones";
import { vinculoBeneficiarioValues, VINCULO_LABEL } from "@/lib/validation/desvinculaciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Beneficiario = { id: string; nombre: string; vinculo: string };

export function BeneficiariosPanel({
  eventoId,
  beneficiariosIniciales,
}: {
  eventoId: string;
  beneficiariosIniciales: Beneficiario[];
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [vinculo, setVinculo] = useState<string>("CONYUGE_CONVIVIENTE");
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Beneficiarios (art. 248)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {beneficiariosIniciales.length > 0 && (
          <ul className="space-y-1 text-sm">
            {beneficiariosIniciales.map((b) => (
              <li key={b.id}>
                {b.nombre} — {VINCULO_LABEL[b.vinculo as keyof typeof VINCULO_LABEL]}
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-2">
          <div className="space-y-2">
            <Label htmlFor="nombreBeneficiario">Nombre</Label>
            <Input id="nombreBeneficiario" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Vínculo</Label>
            <Select value={vinculo} onValueChange={setVinculo}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vinculoBeneficiarioValues.map((v) => (
                  <SelectItem key={v} value={v}>
                    {VINCULO_LABEL[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={pending || !nombre.trim()}
            onClick={() =>
              startTransition(async () => {
                const result = await agregarBeneficiario(
                  eventoId,
                  nombre,
                  vinculo as (typeof vinculoBeneficiarioValues)[number],
                );
                if (result.ok) {
                  toast.success("Beneficiario agregado.");
                  setNombre("");
                  router.refresh();
                } else {
                  toast.error(result.error);
                }
              })
            }
          >
            Agregar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
