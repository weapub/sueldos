"use server";

import { db } from "@/lib/db";
import { requireEmpresaAccess, AuthzError } from "@/lib/authz";

export async function obtenerSaldoFal(empresaId: string) {
  try {
    await requireEmpresaAccess(empresaId);
    const falCuenta = await db.falCuenta.findUnique({ where: { empresaId } });
    return { ok: true as const, data: falCuenta };
  } catch (err) {
    return { ok: false as const, error: err instanceof AuthzError ? err.message : "Error al obtener el saldo del FAL." };
  }
}

export async function listarMovimientosFal(empresaId: string) {
  try {
    await requireEmpresaAccess(empresaId);
    const falCuenta = await db.falCuenta.findUnique({
      where: { empresaId },
      include: {
        movimientos: {
          orderBy: { fecha: "desc" },
          include: { periodo: true, evento: { include: { legajo: true } } },
        },
      },
    });
    return { ok: true as const, data: falCuenta };
  } catch (err) {
    return { ok: false as const, error: err instanceof AuthzError ? err.message : "Error al listar movimientos del FAL." };
  }
}
