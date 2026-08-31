"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { LegajoForm } from "./legajo-form";
import { ImportarAlta } from "./importar-alta";
import type { ActionResult } from "@/actions/empresas";
import { aplicarDatosEmpresaDesdeAlta, type AltaArcaResultado } from "@/actions/altaArca";
import type { CambioEmpresa } from "@/lib/arca/mapearAlta";

function BannerEmpresa({
  empresaId,
  cambios,
}: {
  empresaId: string;
  cambios: CambioEmpresa[];
}) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState<Set<string>>(
    () => new Set(cambios.map((c) => c.campo)),
  );
  const [aplicado, setAplicado] = useState(false);
  const [pending, startTransition] = useTransition();

  if (aplicado) return null;

  function toggle(campo: string, on: boolean) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (on) next.add(campo);
      else next.delete(campo);
      return next;
    });
  }

  function aplicar() {
    const payload: Record<string, string> = {};
    for (const c of cambios) {
      if (seleccion.has(c.campo)) payload[c.campo] = c.detectado;
    }
    if (Object.keys(payload).length === 0) {
      toast.error("Elegí al menos un campo.");
      return;
    }
    startTransition(async () => {
      const res = await aplicarDatosEmpresaDesdeAlta(empresaId, payload);
      if (res.ok) {
        toast.success("Datos de la empresa actualizados.");
        setAplicado(true);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
      <p className="text-sm font-medium">
        El alta trae datos de la empresa distintos a los cargados. ¿Actualizar?
      </p>
      <ul className="space-y-2">
        {cambios.map((c) => (
          <li key={c.campo} className="flex items-start gap-2 text-sm">
            <Checkbox
              id={`cambio-${c.campo}`}
              checked={seleccion.has(c.campo)}
              onCheckedChange={(v) => toggle(c.campo, v === true)}
              className="mt-0.5"
            />
            <label htmlFor={`cambio-${c.campo}`} className="space-y-0.5">
              <span className="font-medium">{c.etiqueta}: </span>
              <span className="text-muted-foreground line-through">{c.actual || "(vacío)"}</span>
              <span className="mx-1">→</span>
              <span>{c.detectado}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={aplicar} disabled={pending}>
          {pending ? "Aplicando..." : "Aplicar a la empresa"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAplicado(true)}>
          Ignorar
        </Button>
      </div>
    </div>
  );
}

export function NuevoLegajoCliente({
  empresaId,
  categorias,
  ocrHabilitado,
  crearAction,
  procesarAltaAction,
}: {
  empresaId: string;
  categorias: { id: string; nombre: string }[];
  ocrHabilitado: boolean;
  crearAction: (
    prevState: unknown,
    formData: FormData,
  ) => Promise<ActionResult<{ id: string }>>;
  procesarAltaAction: (
    prevState: unknown,
    formData: FormData,
  ) => Promise<ActionResult<AltaArcaResultado>>;
}) {
  const [resultado, setResultado] = useState<AltaArcaResultado | null>(null);
  const [version, setVersion] = useState(0);
  const sinCategorias = categorias.length === 0;

  const onExtraido = useCallback((r: AltaArcaResultado) => {
    setResultado(r);
    setVersion((v) => v + 1);
  }, []);

  let notaCategoria: string | null = null;
  if (resultado && !resultado.categoriaId) {
    const conv = resultado.alta.convenioDescripcion ?? resultado.alta.convenioCodigo;
    const cat = resultado.alta.categoriaDescripcion ?? resultado.alta.categoriaCodigo;
    if (conv || cat) {
      notaCategoria = `Detectamos ${[conv && `convenio "${conv}"`, cat && `categoría "${cat}"`]
        .filter(Boolean)
        .join(" / ")}, pero no coincide con ninguna categoría cargada. Cargala en la pestaña Categorías de la empresa y volvé a esta pantalla.`;
    }
  }

  return (
    <div className="space-y-5">
      {ocrHabilitado && <ImportarAlta action={procesarAltaAction} onExtraido={onExtraido} />}

      {resultado && resultado.empresaCambios.length > 0 && (
        <BannerEmpresa
          key={`banner-${version}`}
          empresaId={empresaId}
          cambios={resultado.empresaCambios}
        />
      )}

      {sinCategorias ? (
        <p className="text-sm text-destructive">
          Antes de cargar un legajo, cargá al menos una categoría de convenio para la empresa en{" "}
          <Link href={`/empresas/${empresaId}`} className="underline">
            la pestaña Categorías
          </Link>
          .
        </p>
      ) : (
        <LegajoForm
          key={`form-${version}`}
          empresaId={empresaId}
          categorias={categorias}
          action={crearAction}
          valoresIniciales={resultado?.legajo}
          categoriaIdSugerida={resultado?.categoriaId}
          notaCategoria={notaCategoria}
        />
      )}
    </div>
  );
}
