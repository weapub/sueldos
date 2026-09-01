"use server";

import { db } from "@/lib/db";
import { requireEscritura, requireRole, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { Role } from "@/generated/prisma/enums";
import { familiarSchema, escalaAsignacionSchema } from "@/lib/validation/asignaciones";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/empresas";

// ---------- Familiares a cargo (por legajo) ----------

async function legajoConEmpresa(legajoId: string) {
  const legajo = await db.legajo.findUnique({ where: { id: legajoId }, select: { empresaId: true } });
  if (!legajo) throw new AuthzError("Legajo no encontrado.");
  return legajo;
}

export async function crearFamiliar(
  legajoId: string,
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { empresaId } = await legajoConEmpresa(legajoId);
    const session = await requireEscritura(empresaId);
    const parsed = familiarSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const v = parsed.data;
    const familiar = await db.familiarACargo.create({
      data: {
        legajoId,
        nombre: v.nombre,
        vinculo: v.vinculo,
        fechaNacimiento: v.fechaNacimiento ? new Date(v.fechaNacimiento) : null,
        enEscolaridad: v.enEscolaridad,
      },
    });
    await logAudit({
      usuarioId: session.user.id,
      accion: "FAMILIAR_CREADO",
      entidad: "Legajo",
      entidadId: legajoId,
      detalle: { nombre: v.nombre, vinculo: v.vinculo },
    });
    revalidatePath(`/empresas/${empresaId}/legajos/${legajoId}`);
    return { ok: true, data: { id: familiar.id } };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al agregar el familiar." };
  }
}

export async function eliminarFamiliar(familiarId: string): Promise<ActionResult> {
  try {
    const familiar = await db.familiarACargo.findUnique({
      where: { id: familiarId },
      include: { legajo: { select: { id: true, empresaId: true } } },
    });
    if (!familiar) return { ok: false, error: "Familiar no encontrado." };
    const session = await requireEscritura(familiar.legajo.empresaId);
    await db.familiarACargo.delete({ where: { id: familiarId } });
    await logAudit({
      usuarioId: session.user.id,
      accion: "FAMILIAR_ELIMINADO",
      entidad: "Legajo",
      entidadId: familiar.legajo.id,
      detalle: { familiarId },
    });
    revalidatePath(`/empresas/${familiar.legajo.empresaId}/legajos/${familiar.legajo.id}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al eliminar el familiar." };
  }
}

export async function actualizarDatosAsignaciones(
  legajoId: string,
  datos: { conyugeEmbarazada: boolean; igfDeclarado: string | null; zonaAsignacion: string },
): Promise<ActionResult> {
  try {
    const { empresaId } = await legajoConEmpresa(legajoId);
    const session = await requireEscritura(empresaId);
    const igf = datos.igfDeclarado?.trim() ? Number(datos.igfDeclarado) : null;
    if (igf !== null && (!Number.isFinite(igf) || igf < 0)) {
      return { ok: false, error: "IGF inválido." };
    }
    await db.legajo.update({
      where: { id: legajoId },
      data: {
        conyugeEmbarazada: datos.conyugeEmbarazada,
        igfDeclarado: igf,
        zonaAsignacion: datos.zonaAsignacion.trim() || "GENERAL",
      },
    });
    await logAudit({
      usuarioId: session.user.id,
      accion: "LEGAJO_DATOS_ASIGNACIONES",
      entidad: "Legajo",
      entidadId: legajoId,
      detalle: { ...datos },
    });
    revalidatePath(`/empresas/${empresaId}/legajos/${legajoId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al guardar los datos." };
  }
}

// ---------- Escala de asignaciones (global, parametrizable) ----------

export async function listarEscalaAsignaciones() {
  try {
    await requireRole(Role.CONTADOR, Role.ASISTENTE);
    const filas = await db.escalaAsignacionFamiliar.findMany({
      orderBy: [{ tipo: "asc" }, { zona: "asc" }, { vigenciaDesde: "desc" }, { igfDesde: "asc" }],
    });
    return { ok: true as const, data: filas };
  } catch (err) {
    return { ok: false as const, error: err instanceof AuthzError ? err.message : "Error al listar la escala." };
  }
}

export async function crearEscalaAsignacion(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole(Role.CONTADOR, Role.ASISTENTE);
    const parsed = escalaAsignacionSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const v = parsed.data;
    const fila = await db.escalaAsignacionFamiliar.create({
      data: {
        tipo: v.tipo,
        zona: v.zona || "GENERAL",
        igfDesde: v.igfDesde,
        igfHasta: v.igfHasta ?? null,
        monto: v.monto,
        vigenciaDesde: new Date(v.vigenciaDesde),
      },
    });
    await logAudit({
      usuarioId: session.user.id,
      accion: "ESCALA_ASIGNACION_CREADA",
      entidad: "EscalaAsignacionFamiliar",
      entidadId: fila.id,
      detalle: { tipo: v.tipo, monto: v.monto },
    });
    revalidatePath("/configuracion/asignaciones");
    return { ok: true, data: { id: fila.id } };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al crear la fila." };
  }
}

export async function eliminarEscalaAsignacion(id: string): Promise<ActionResult> {
  try {
    const session = await requireRole(Role.CONTADOR, Role.ASISTENTE);
    await db.escalaAsignacionFamiliar.delete({ where: { id } });
    await logAudit({
      usuarioId: session.user.id,
      accion: "ESCALA_ASIGNACION_ELIMINADA",
      entidad: "EscalaAsignacionFamiliar",
      entidadId: id,
    });
    revalidatePath("/configuracion/asignaciones");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al eliminar la fila." };
  }
}
