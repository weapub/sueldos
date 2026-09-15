"use server";

import { db } from "@/lib/db";
import { requireEmpresaAccess, AuthzError } from "@/lib/authz";

export async function listarMovimientosFondoCese(legajoId: string) {
  try {
    const legajo = await db.legajo.findUnique({ where: { id: legajoId }, select: { empresaId: true } });
    if (!legajo) return { ok: false as const, error: "Legajo no encontrado." };
    await requireEmpresaAccess(legajo.empresaId);

    const cuenta = await db.fondoCeseCuenta.findUnique({
      where: { legajoId },
      include: {
        movimientos: {
          orderBy: { fecha: "desc" },
          include: { periodo: true, evento: true },
        },
      },
    });
    return { ok: true as const, data: cuenta };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AuthzError ? err.message : "Error al listar movimientos del Fondo de Cese Laboral.",
    };
  }
}
