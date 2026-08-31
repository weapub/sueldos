"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireEscritura, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { extraerAltaArca, AltaArcaError } from "@/lib/arca/extraerAlta";
import {
  esMediaTypeAceptado,
  TAMANO_MAX_ARCHIVO,
  type AltaArcaExtraida,
} from "@/lib/arca/schema";
import {
  mapearAltaALegajo,
  mapearAltaAEmpresa,
  matchCategoria,
  diffEmpresa,
  type LegajoDesdeAlta,
  type CambioEmpresa,
} from "@/lib/arca/mapearAlta";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/empresas";

export type AltaArcaResultado = {
  alta: AltaArcaExtraida;
  legajo: LegajoDesdeAlta;
  categoriaId: string | null;
  empresaCambios: CambioEmpresa[];
};

export async function procesarAltaArca(
  empresaId: string,
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult<AltaArcaResultado>> {
  try {
    const session = await requireEscritura(empresaId);

    const archivo = formData.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) {
      return { ok: false, error: "Subí una foto o PDF del alta." };
    }
    if (!esMediaTypeAceptado(archivo.type)) {
      return { ok: false, error: "Formato no soportado. Usá una imagen (JPG/PNG) o un PDF." };
    }
    if (archivo.size > TAMANO_MAX_ARCHIVO) {
      return { ok: false, error: "El archivo es muy grande (máximo 10 MB)." };
    }

    const empresa = await db.empresa.findUnique({
      where: { id: empresaId },
      include: { categorias: { orderBy: { nombre: "asc" } } },
    });
    if (!empresa) return { ok: false, error: "Empresa no encontrada." };

    const alta = await extraerAltaArca({
      buffer: Buffer.from(await archivo.arrayBuffer()),
      mediaType: archivo.type,
    });

    const empresaDetectada = mapearAltaAEmpresa(alta);
    const resultado: AltaArcaResultado = {
      alta,
      legajo: mapearAltaALegajo(alta),
      categoriaId: matchCategoria(
        alta,
        empresa.categorias.map((c) => ({ id: c.id, nombre: c.nombre })),
      ),
      empresaCambios: diffEmpresa(
        {
          razonSocial: empresa.razonSocial,
          cuit: empresa.cuit,
          actividad: empresa.actividad,
          provincia: empresa.provincia,
          direccion: empresa.direccion,
        },
        empresaDetectada,
      ),
    };

    await logAudit({
      usuarioId: session.user.id,
      accion: "ALTA_ARCA_PROCESADA",
      entidad: "Empresa",
      entidadId: empresaId,
      detalle: {
        cuil: alta.empleadoCuil ?? null,
        categoriaMatch: resultado.categoriaId != null,
        camposEmpresa: resultado.empresaCambios.map((c) => c.campo),
      },
    });

    return { ok: true, data: resultado };
  } catch (err) {
    if (err instanceof AuthzError) return { ok: false, error: err.message };
    if (err instanceof AltaArcaError) return { ok: false, error: err.message };
    return {
      ok: false,
      error: "No pudimos leer el alta. Probá con una foto más nítida o cargá los datos a mano.",
    };
  }
}

const cambiosEmpresaSchema = z
  .object({
    razonSocial: z.string().trim().min(2).optional(),
    cuit: z
      .string()
      .trim()
      .regex(/^\d{2}-?\d{8}-?\d{1}$/)
      .optional(),
    actividad: z.string().trim().min(2).optional(),
    provincia: z.string().trim().min(2).optional(),
    direccion: z.string().trim().min(1).optional(),
  })
  .strict();

export async function aplicarDatosEmpresaDesdeAlta(
  empresaId: string,
  cambios: Record<string, string>,
): Promise<ActionResult> {
  try {
    const session = await requireEscritura(empresaId);

    const parsed = cambiosEmpresaSchema.safeParse(cambios);
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return { ok: false, error: "No hay cambios válidos para aplicar." };
    }

    await db.empresa.update({ where: { id: empresaId }, data: parsed.data });
    await logAudit({
      usuarioId: session.user.id,
      accion: "EMPRESA_ACTUALIZADA",
      entidad: "Empresa",
      entidadId: empresaId,
      detalle: { origen: "alta_arca", ...parsed.data },
    });

    revalidatePath("/empresas");
    revalidatePath(`/empresas/${empresaId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002") {
      return { ok: false, error: "Ya existe una empresa con ese CUIT." };
    }
    return {
      ok: false,
      error: err instanceof AuthzError ? err.message : "Error al actualizar la empresa.",
    };
  }
}
