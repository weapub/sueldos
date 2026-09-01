"use server";

import { db } from "@/lib/db";
import { requireEmpresaAccess, requireEscritura, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { licenciaSchema } from "@/lib/validation/licencias";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/empresas";

export async function listarLicencias(legajoId: string) {
  try {
    const legajo = await db.legajo.findUnique({ where: { id: legajoId }, select: { empresaId: true } });
    if (!legajo) return { ok: false as const, error: "Legajo no encontrado." };
    await requireEmpresaAccess(legajo.empresaId);
    const licencias = await db.licencia.findMany({
      where: { legajoId },
      orderBy: { desde: "desc" },
    });
    return { ok: true as const, data: licencias };
  } catch (err) {
    return { ok: false as const, error: err instanceof AuthzError ? err.message : "Error al listar licencias." };
  }
}

export async function crearLicencia(
  legajoId: string,
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const legajo = await db.legajo.findUnique({ where: { id: legajoId }, select: { empresaId: true } });
    if (!legajo) return { ok: false, error: "Legajo no encontrado." };
    const session = await requireEscritura(legajo.empresaId);
    const parsed = licenciaSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const v = parsed.data;
    const licencia = await db.licencia.create({
      data: {
        legajoId,
        tipo: v.tipo,
        desde: new Date(v.desde),
        hasta: new Date(v.hasta),
        conGoce: v.conGoce,
        observaciones: v.observaciones || null,
      },
    });
    await logAudit({
      usuarioId: session.user.id,
      accion: "LICENCIA_CREADA",
      entidad: "Legajo",
      entidadId: legajoId,
      detalle: { tipo: v.tipo, desde: v.desde, hasta: v.hasta, conGoce: v.conGoce },
    });
    revalidatePath(`/empresas/${legajo.empresaId}/legajos/${legajoId}`);
    return { ok: true, data: { id: licencia.id } };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al crear la licencia." };
  }
}

export async function eliminarLicencia(licenciaId: string): Promise<ActionResult> {
  try {
    const licencia = await db.licencia.findUnique({
      where: { id: licenciaId },
      include: { legajo: { select: { id: true, empresaId: true } } },
    });
    if (!licencia) return { ok: false, error: "Licencia no encontrada." };
    const session = await requireEscritura(licencia.legajo.empresaId);
    await db.licencia.delete({ where: { id: licenciaId } });
    await logAudit({
      usuarioId: session.user.id,
      accion: "LICENCIA_ELIMINADA",
      entidad: "Legajo",
      entidadId: licencia.legajo.id,
      detalle: { licenciaId },
    });
    revalidatePath(`/empresas/${licencia.legajo.empresaId}/legajos/${licencia.legajo.id}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al eliminar la licencia." };
  }
}
