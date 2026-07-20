"use server";

import { db } from "@/lib/db";
import { requireRole, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { tasaSchema } from "@/lib/validation/tasas";
import { Role } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/empresas";

/** Lista, por cada clave, únicamente la versión global vigente más reciente. */
export async function listarTasasVigentes() {
  try {
    await requireRole(Role.CONTADOR, Role.ASISTENTE);
    const tasas = await db.tasaLaboral.findMany({
      where: { empresaId: null },
      orderBy: [{ clave: "asc" }, { vigenciaDesde: "desc" }],
    });

    const vigentesPorClave = new Map<string, (typeof tasas)[number]>();
    for (const tasa of tasas) {
      if (!vigentesPorClave.has(tasa.clave)) vigentesPorClave.set(tasa.clave, tasa);
    }

    return { ok: true as const, data: Array.from(vigentesPorClave.values()) };
  } catch (err) {
    return { ok: false as const, error: err instanceof AuthzError ? err.message : "Error al listar tasas." };
  }
}

/** Inserta una nueva versión de la tasa (nunca muta el histórico). */
export async function actualizarTasa(_prevState: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole(Role.CONTADOR);
    const parsed = tasaSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const v = parsed.data;
    const vigenciaDesde = new Date(v.vigenciaDesde);

    const nueva = await db.$transaction(async (tx) => {
      await tx.tasaLaboral.updateMany({
        where: { empresaId: null, clave: v.clave, vigenciaHasta: null },
        data: { vigenciaHasta: vigenciaDesde },
      });
      return tx.tasaLaboral.create({
        data: { clave: v.clave, valor: v.valor, vigenciaDesde },
      });
    });

    await logAudit({
      usuarioId: session.user.id,
      accion: "TASA_ACTUALIZADA",
      entidad: "TasaLaboral",
      entidadId: nueva.id,
      detalle: { clave: v.clave, valor: v.valor, vigenciaDesde: v.vigenciaDesde },
    });

    revalidatePath("/configuracion/tasas");
    return { ok: true, data: { id: nueva.id } };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al actualizar la tasa." };
  }
}
