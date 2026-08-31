"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import type { ActionResult } from "@/actions/empresas";
import type { AltaArcaResultado } from "@/actions/altaArca";

const MAX_LADO = 1600;

/** Reduce una imagen grande antes de subirla (menos payload y menos tokens de visión). */
async function reducirImagen(file: File): Promise<File> {
  try {
    const url = URL.createObjectURL(file);
    const img = document.createElement("img");
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("no se pudo cargar la imagen"));
      img.src = url;
    });
    URL.revokeObjectURL(url);

    const escala = Math.min(1, MAX_LADO / Math.max(img.naturalWidth, img.naturalHeight));
    if (escala === 1 && file.size < 3 * 1024 * 1024) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * escala);
    canvas.height = Math.round(img.naturalHeight * escala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8),
    );
    if (!blob) return file;
    return new File([blob], "alta.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function ImportarAlta({
  action,
  onExtraido,
}: {
  action: (
    prevState: unknown,
    formData: FormData,
  ) => Promise<ActionResult<AltaArcaResultado>>;
  onExtraido: (resultado: AltaArcaResultado) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  function elegirArchivo(f: File | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setFile(f);
    if (f && f.type !== "application/pdf") {
      const url = URL.createObjectURL(f);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }

  const [state, submit, pending] = useActionState<
    ActionResult<AltaArcaResultado> | null,
    FormData
  >(async (prev, formData) => action(prev, formData), null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Datos leídos del alta. Revisá y completá lo que falte.");
      onExtraido(state.data);
    } else {
      toast.error(state.error);
    }
  }, [state, onExtraido]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  async function handleExtraer() {
    if (!file) return;
    const archivo = file.type === "application/pdf" ? file : await reducirImagen(file);
    const fd = new FormData();
    fd.set("archivo", archivo);
    submit(fd);
  }

  return (
    <div className="space-y-3 rounded-md border border-dashed p-4">
      <div className="space-y-1">
        <Label htmlFor="alta-archivo" className="text-sm font-medium">
          Importar desde el alta de ARCA (opcional)
        </Label>
        <p className="text-xs text-muted-foreground">
          Subí una foto o PDF de la &ldquo;Constancia del Trabajador – Alta&rdquo; y precargamos el
          formulario.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          id="alta-archivo"
          type="file"
          accept="image/*,application/pdf"
          className="text-sm file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
          onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
        />
        <Button type="button" onClick={handleExtraer} disabled={!file || pending}>
          <Upload className="size-4" />
          {pending ? "Leyendo..." : "Extraer datos"}
        </Button>
      </div>

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Vista previa del alta"
          className="max-h-48 rounded border object-contain"
        />
      )}
      {file?.type === "application/pdf" && (
        <p className="text-xs text-muted-foreground">{file.name}</p>
      )}
    </div>
  );
}
