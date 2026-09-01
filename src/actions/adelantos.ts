"use server";

import { db } from "@/lib/db";
import { requireEmpresaAccess, requireEscritura, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { adelantoSchema } from "@/lib/validation/adelantos";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/empresas";

export async function listarAdelantos(legajoId: string) {
  try {
    const legajo = await db.legajo.findUnique({ where: { id: legajoId }, select: { empresaId: true } });
    if (!legajo) return { ok: false as const, error: "Legajo no encontrado." };
    await requireEmpresaAccess(legajo.empresaId);
    const adelantos = await db.adelantoSueldo.findMany({
      where: { legajoId },
      orderBy: { fecha: "desc" },
    });
    return { ok: true as const, data: adelantos };
  } catch (err) {
    return { ok: false as const, error: err instanceof AuthzError ? err.message : "Error al listar adelantos." };
  }
}

export async function crearAdelanto(
  legajoId: string,
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const legajo = await db.legajo.findUnique({ where: { id: legajoId }, select: { empresaId: true } });
    if (!legajo) return { ok: false, error: "Legajo no encontrado." };
    const session = await requireEscritura(legajo.empresaId);
    const parsed = adelantoSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const v = parsed.data;
    const adelanto = await db.adelantoSueldo.create({
      data: {
        legajoId,
        fecha: new Date(v.fecha),
        monto: v.monto,
        observaciones: v.observaciones || null,
      },
    });
    await logAudit({
      usuarioId: session.user.id,
      accion: "ADELANTO_CREADO",
      entidad: "Legajo",
      entidadId: legajoId,
      detalle: { monto: v.monto, fecha: v.fecha },
    });
    revalidatePath(`/empresas/${legajo.empresaId}/legajos/${legajoId}`);
    return { ok: true, data: { id: adelanto.id } };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al crear el adelanto." };
  }
}

export async function eliminarAdelanto(adelantoId: string): Promise<ActionResult> {
  try {
    const adelanto = await db.adelantoSueldo.findUnique({
      where: { id: adelantoId },
      include: { legajo: { select: { id: true, empresaId: true } } },
    });
    if (!adelanto) return { ok: false, error: "Adelanto no encontrado." };
    const session = await requireEscritura(adelanto.legajo.empresaId);
    if (adelanto.aplicadoEnLiquidacionId) {
      return {
        ok: false,
        error: "El adelanto ya se descontó en una liquidación. Recalculá o eliminá esa liquidación primero.",
      };
    }
    await db.adelantoSueldo.delete({ where: { id: adelantoId } });
    await logAudit({
      usuarioId: session.user.id,
      accion: "ADELANTO_ELIMINADO",
      entidad: "Legajo",
      entidadId: adelanto.legajo.id,
      detalle: { adelantoId },
    });
    revalidatePath(`/empresas/${adelanto.legajo.empresaId}/legajos/${adelanto.legajo.id}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al eliminar el adelanto." };
  }
}
