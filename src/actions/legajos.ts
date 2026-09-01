"use server";

import { db } from "@/lib/db";
import { requireEmpresaAccess, requireEscritura, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { legajoSchema, categoriaConvenioSchema } from "@/lib/validation/legajos";
import { CATALOGO_CCT_130_75 } from "@/lib/catalogoConvenios";
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

export async function actualizarLegajo(
  legajoId: string,
  empresaId: string,
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireEscritura(empresaId);

    const actual = await db.legajo.findUnique({ where: { id: legajoId }, select: { empresaId: true } });
    if (!actual || actual.empresaId !== empresaId) {
      return { ok: false, error: "Legajo no encontrado." };
    }

    const parsed = legajoSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
    }
    const v = parsed.data;

    await db.legajo.update({
      where: { id: legajoId },
      data: {
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
      accion: "LEGAJO_ACTUALIZADO",
      entidad: "Legajo",
      entidadId: legajoId,
      detalle: { numeroLegajo: v.numeroLegajo, apellido: v.apellido },
    });

    revalidatePath(`/empresas/${empresaId}/legajos`);
    revalidatePath(`/empresas/${empresaId}/legajos/${legajoId}`);
    return { ok: true, data: { id: legajoId } };
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002") {
      return { ok: false, error: "Ya existe otro legajo con ese número o CUIL." };
    }
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al actualizar el legajo." };
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

/**
 * Crea de una sola vez todas las categorías del CCT 130/75 (escala FAECYS) que aún no
 * existan para la empresa. Matchea por nombre (case-insensitive) para no duplicar.
 */
export async function cargarEscalaCCT13075(
  empresaId: string,
  vigenciaDesde: string,
): Promise<ActionResult<{ creadas: number; salteadas: number }>> {
  try {
    const session = await requireEscritura(empresaId);
    if (!vigenciaDesde) return { ok: false, error: "Elegí la fecha de vigencia." };
    const vigencia = new Date(vigenciaDesde);
    if (Number.isNaN(vigencia.getTime())) return { ok: false, error: "Fecha de vigencia inválida." };

    const existentes = await db.categoriaConvenio.findMany({
      where: { empresaId },
      select: { nombre: true },
    });
    const yaHay = new Set(existentes.map((c) => c.nombre.trim().toLowerCase()));

    const aCrear = CATALOGO_CCT_130_75.filter((p) => !yaHay.has(p.nombre.trim().toLowerCase()));
    if (aCrear.length > 0) {
      await db.categoriaConvenio.createMany({
        data: aCrear.map((p) => ({
          empresaId,
          nombre: p.nombre,
          convenioNombre: p.convenioNombre,
          salarioBaseConvenio: p.salarioBaseConvenio,
          remuneracionNoRemunerativa: p.remuneracionNoRemunerativa,
          vigenciaDesde: vigencia,
        })),
      });
    }

    await logAudit({
      usuarioId: session.user.id,
      accion: "CATEGORIAS_CCT_CARGADAS",
      entidad: "Empresa",
      entidadId: empresaId,
      detalle: { creadas: aCrear.length, vigenciaDesde },
    });

    revalidatePath(`/empresas/${empresaId}`);
    return {
      ok: true,
      data: { creadas: aCrear.length, salteadas: CATALOGO_CCT_130_75.length - aCrear.length },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof AuthzError ? err.message : "Error al cargar la escala CCT 130/75.",
    };
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
