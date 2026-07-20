"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireRole, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { usuarioSchema } from "@/lib/validation/usuarios";
import { Role } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/empresas";

export async function listarUsuarios() {
  try {
    await requireRole(Role.CONTADOR);
    const usuarios = await db.usuario.findMany({
      include: { empresa: { select: { razonSocial: true } } },
      orderBy: { nombre: "asc" },
    });
    return { ok: true as const, data: usuarios };
  } catch (err) {
    return { ok: false as const, error: err instanceof AuthzError ? err.message : "Error al listar usuarios." };
  }
}

export async function crearUsuario(_prevState: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole(Role.CONTADOR);
    const parsed = usuarioSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const v = parsed.data;
    const passwordHash = await bcrypt.hash(v.password, 12);

    const usuario = await db.usuario.create({
      data: {
        email: v.email,
        nombre: v.nombre,
        passwordHash,
        role: v.role,
        empresaId: v.role === "CLIENTE" ? v.empresaId || null : null,
      },
    });

    await logAudit({
      usuarioId: session.user.id,
      accion: "USUARIO_CREADO",
      entidad: "Usuario",
      entidadId: usuario.id,
      detalle: { email: usuario.email, role: usuario.role },
    });

    revalidatePath("/configuracion/usuarios");
    return { ok: true, data: { id: usuario.id } };
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002") {
      return { ok: false, error: "Ya existe un usuario con ese email." };
    }
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al crear el usuario." };
  }
}

export async function actualizarUsuario(
  usuarioId: string,
  data: Prisma.UsuarioUncheckedUpdateInput,
): Promise<ActionResult> {
  try {
    const session = await requireRole(Role.CONTADOR);
    await db.usuario.update({ where: { id: usuarioId }, data });
    await logAudit({
      usuarioId: session.user.id,
      accion: "USUARIO_ACTUALIZADO",
      entidad: "Usuario",
      entidadId: usuarioId,
      detalle: JSON.parse(JSON.stringify(data)),
    });
    revalidatePath("/configuracion/usuarios");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al actualizar el usuario." };
  }
}

export async function resetearPassword(usuarioId: string, nuevaPassword: string): Promise<ActionResult> {
  try {
    const session = await requireRole(Role.CONTADOR);
    if (nuevaPassword.length < 8) {
      return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
    }
    const passwordHash = await bcrypt.hash(nuevaPassword, 12);
    await db.usuario.update({ where: { id: usuarioId }, data: { passwordHash } });
    await logAudit({
      usuarioId: session.user.id,
      accion: "USUARIO_RESET_PASSWORD",
      entidad: "Usuario",
      entidadId: usuarioId,
    });
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al resetear la contraseña." };
  }
}
