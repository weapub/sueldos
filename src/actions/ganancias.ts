"use server";

import { db } from "@/lib/db";
import { requireEscritura, requireRole, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { Role } from "@/generated/prisma/enums";
import {
  gananciasParametroSchema,
  gananciasTramoSchema,
  gananciasLegajoConfigSchema,
} from "@/lib/validation/ganancias";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/empresas";

// ---------- Parámetros + escala (global) ----------

export async function listarParametrosGanancias() {
  try {
    await requireRole(Role.CONTADOR, Role.ASISTENTE);
    const parametros = await db.gananciasParametro.findMany({
      orderBy: { vigenciaDesde: "desc" },
      include: { tramos: { orderBy: { orden: "asc" } } },
    });
    return { ok: true as const, data: parametros };
  } catch (err) {
    return { ok: false as const, error: err instanceof AuthzError ? err.message : "Error al listar parámetros." };
  }
}

export async function crearParametroGanancias(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole(Role.CONTADOR, Role.ASISTENTE);
    const parsed = gananciasParametroSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    const v = parsed.data;
    const p = await db.gananciasParametro.create({
      data: {
        mni: v.mni,
        deduccionEspecial: v.deduccionEspecial,
        deduccionConyuge: v.deduccionConyuge,
        deduccionHijo: v.deduccionHijo,
        vigenciaDesde: new Date(v.vigenciaDesde),
      },
    });
    await logAudit({
      usuarioId: session.user.id,
      accion: "GANANCIAS_PARAMETRO_CREADO",
      entidad: "GananciasParametro",
      entidadId: p.id,
      detalle: { vigenciaDesde: v.vigenciaDesde },
    });
    revalidatePath("/configuracion/ganancias");
    return { ok: true, data: { id: p.id } };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al crear el parámetro." };
  }
}

export async function eliminarParametroGanancias(id: string): Promise<ActionResult> {
  try {
    const session = await requireRole(Role.CONTADOR, Role.ASISTENTE);
    await db.gananciasParametro.delete({ where: { id } });
    await logAudit({
      usuarioId: session.user.id,
      accion: "GANANCIAS_PARAMETRO_ELIMINADO",
      entidad: "GananciasParametro",
      entidadId: id,
    });
    revalidatePath("/configuracion/ganancias");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al eliminar el parámetro." };
  }
}

export async function crearTramoGanancias(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole(Role.CONTADOR, Role.ASISTENTE);
    const parsed = gananciasTramoSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    const v = parsed.data;
    const t = await db.gananciasEscalaTramo.create({
      data: {
        parametroId: v.parametroId,
        desde: v.desde,
        hasta: v.hasta ?? null,
        montoFijo: v.montoFijo,
        porcentaje: v.porcentaje,
        orden: v.orden,
      },
    });
    await logAudit({
      usuarioId: session.user.id,
      accion: "GANANCIAS_TRAMO_CREADO",
      entidad: "GananciasEscalaTramo",
      entidadId: t.id,
    });
    revalidatePath("/configuracion/ganancias");
    return { ok: true, data: { id: t.id } };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al crear el tramo." };
  }
}

export async function eliminarTramoGanancias(id: string): Promise<ActionResult> {
  try {
    await requireRole(Role.CONTADOR, Role.ASISTENTE);
    await db.gananciasEscalaTramo.delete({ where: { id } });
    revalidatePath("/configuracion/ganancias");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al eliminar el tramo." };
  }
}

// ---------- Config por legajo ----------

export async function guardarGananciasLegajoConfig(
  legajoId: string,
  datos: {
    liquidaGanancias: boolean;
    computaConyuge: boolean;
    cantidadHijosACargo: number | string;
    otrasDeduccionesMensuales: number | string;
  },
): Promise<ActionResult> {
  try {
    const legajo = await db.legajo.findUnique({ where: { id: legajoId }, select: { empresaId: true } });
    if (!legajo) return { ok: false, error: "Legajo no encontrado." };
    const session = await requireEscritura(legajo.empresaId);
    const parsed = gananciasLegajoConfigSchema.safeParse(datos);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    const v = parsed.data;
    await db.gananciasLegajoConfig.upsert({
      where: { legajoId },
      create: { legajoId, ...v },
      update: { ...v },
    });
    await logAudit({
      usuarioId: session.user.id,
      accion: "GANANCIAS_LEGAJO_CONFIG",
      entidad: "Legajo",
      entidadId: legajoId,
      detalle: { ...v },
    });
    revalidatePath(`/empresas/${legajo.empresaId}/legajos/${legajoId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al guardar la configuración." };
  }
}
