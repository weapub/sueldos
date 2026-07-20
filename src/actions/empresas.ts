"use server";

import { db } from "@/lib/db";
import { requireRole, requireEmpresaAccess, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { empresaSchema } from "@/lib/validation/empresas";
import { Role } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function listarEmpresas(): Promise<ActionResult<Awaited<ReturnType<typeof db.empresa.findMany>>>> {
  try {
    const session = await requireRole(Role.CONTADOR, Role.ASISTENTE, Role.CLIENTE);
    const empresas = await db.empresa.findMany({
      where: session.user.role === "CLIENTE" ? { id: session.user.empresaId ?? "" } : undefined,
      orderBy: { razonSocial: "asc" },
    });
    return { ok: true, data: empresas };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al listar empresas." };
  }
}

export async function obtenerEmpresa(empresaId: string) {
  try {
    await requireEmpresaAccess(empresaId);
    const empresa = await db.empresa.findUnique({
      where: { id: empresaId },
      include: { categorias: { orderBy: { nombre: "asc" } }, falCuenta: true },
    });
    if (!empresa) return { ok: false as const, error: "Empresa no encontrada." };
    return { ok: true as const, data: empresa };
  } catch (err) {
    return { ok: false as const, error: err instanceof AuthzError ? err.message : "Error al obtener la empresa." };
  }
}

export async function crearEmpresa(_prevState: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole(Role.CONTADOR, Role.ASISTENTE);
    const parsed = empresaSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }

    const empresa = await db.empresa.create({ data: parsed.data });
    await logAudit({
      usuarioId: session.user.id,
      accion: "EMPRESA_CREADA",
      entidad: "Empresa",
      entidadId: empresa.id,
      detalle: { razonSocial: empresa.razonSocial },
    });

    revalidatePath("/empresas");
    return { ok: true, data: { id: empresa.id } };
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002") {
      return { ok: false, error: "Ya existe una empresa con ese CUIT." };
    }
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al crear la empresa." };
  }
}

export async function actualizarEmpresa(
  empresaId: string,
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireRole(Role.CONTADOR, Role.ASISTENTE);
    const parsed = empresaSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }

    await db.empresa.update({ where: { id: empresaId }, data: parsed.data });
    await logAudit({
      usuarioId: session.user.id,
      accion: "EMPRESA_ACTUALIZADA",
      entidad: "Empresa",
      entidadId: empresaId,
      detalle: { ...parsed.data },
    });

    revalidatePath("/empresas");
    revalidatePath(`/empresas/${empresaId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al actualizar la empresa." };
  }
}

export async function archivarEmpresa(empresaId: string): Promise<ActionResult> {
  try {
    const session = await requireRole(Role.CONTADOR);
    await db.empresa.update({ where: { id: empresaId }, data: { activa: false } });
    await logAudit({
      usuarioId: session.user.id,
      accion: "EMPRESA_ARCHIVADA",
      entidad: "Empresa",
      entidadId: empresaId,
    });
    revalidatePath("/empresas");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al archivar la empresa." };
  }
}
