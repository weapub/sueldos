"use server";

import { db } from "@/lib/db";
import { requireEmpresaAccess, requireEscritura, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { legajoSchema, categoriaConvenioSchema } from "@/lib/validation/legajos";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/empresas";

export async function listarLegajosPorEmpresa(empresaId: string) {
  try {
    await requireEmpresaAccess(empresaId);
    const legajos = await db.legajo.findMany({
      where: { empresaId },
      include: { categoria: true },
      orderBy: { numeroLegajo: "asc" },
    });
    return { ok: true as const, data: legajos };
  } catch (err) {
    return { ok: false as const, error: err instanceof AuthzError ? err.message : "Error al listar legajos." };
  }
}

export async function obtenerLegajo(legajoId: string) {
  try {
    const legajo = await db.legajo.findUnique({
      where: { id: legajoId },
      include: { categoria: true, empresa: true },
    });
    if (!legajo) return { ok: false as const, error: "Legajo no encontrado." };
    await requireEmpresaAccess(legajo.empresaId);
    return { ok: true as const, data: legajo };
  } catch (err) {
    return { ok: false as const, error: err instanceof AuthzError ? err.message : "Error al obtener el legajo." };
  }
}

export async function crearLegajo(
  empresaId: string,
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireEscritura(empresaId);
    const parsed = legajoSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const v = parsed.data;

    const legajo = await db.legajo.create({
      data: {
        empresaId,
        numeroLegajo: v.numeroLegajo,
        nombre: v.nombre,
        apellido: v.apellido,
        cuil: v.cuil,
        fechaNacimiento: new Date(v.fechaNacimiento),
        fechaIngreso: new Date(v.fechaIngreso),
        categoriaId: v.categoriaId,
        tipoContrato: v.tipoContrato,
        modalidadRemuneracion: v.modalidadRemuneracion,
        horasSemanales: v.horasSemanales ?? null,
        horasSemanalesFullTime: v.horasSemanalesFullTime,
        sueldoBasico: v.sueldoBasico,
        obraSocial: v.obraSocial || null,
        afiliadoSindical: v.afiliadoSindical,
        regimenRIFL: v.regimenRIFL,
        regimenRIFLFechaAlta: v.regimenRIFLFechaAlta ? new Date(v.regimenRIFLFechaAlta) : null,
      },
    });

    await logAudit({
      usuarioId: session.user.id,
      accion: "LEGAJO_CREADO",
      entidad: "Legajo",
      entidadId: legajo.id,
      detalle: { numeroLegajo: legajo.numeroLegajo, apellido: legajo.apellido },
    });

    revalidatePath(`/empresas/${empresaId}/legajos`);
    return { ok: true, data: { id: legajo.id } };
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002") {
      return { ok: false, error: "Ya existe un legajo con ese número o CUIL." };
    }
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al crear el legajo." };
  }
}

export async function darDeBajaLegajo(legajoId: string, empresaId: string, fechaEgreso: string): Promise<ActionResult> {
  try {
    const session = await requireEscritura(empresaId);
    await db.legajo.update({
      where: { id: legajoId },
      data: { situacion: "DESVINCULADO", fechaEgreso: new Date(fechaEgreso) },
    });
    await logAudit({
      usuarioId: session.user.id,
      accion: "LEGAJO_BAJA",
      entidad: "Legajo",
      entidadId: legajoId,
      detalle: { fechaEgreso },
    });
    revalidatePath(`/empresas/${empresaId}/legajos`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al dar de baja el legajo." };
  }
}

export async function crearCategoria(
  empresaId: string,
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireEscritura(empresaId);
    const parsed = categoriaConvenioSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const v = parsed.data;

    const categoria = await db.categoriaConvenio.create({
      data: {
        empresaId,
        nombre: v.nombre,
        convenioNombre: v.convenioNombre || null,
        salarioBaseConvenio: v.salarioBaseConvenio,
        vigenciaDesde: new Date(v.vigenciaDesde),
      },
    });

    await logAudit({
      usuarioId: session.user.id,
      accion: "CATEGORIA_CREADA",
      entidad: "CategoriaConvenio",
      entidadId: categoria.id,
      detalle: { nombre: categoria.nombre, salarioBaseConvenio: v.salarioBaseConvenio },
    });

    revalidatePath(`/empresas/${empresaId}`);
    return { ok: true, data: { id: categoria.id } };
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002") {
      return { ok: false, error: "Ya existe una categoría con ese nombre y vigencia." };
    }
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al crear la categoría." };
  }
}
