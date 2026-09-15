"use server";

import { db } from "@/lib/db";
import { requireRole, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { CLAVE_TASA_LABEL, claveTasaValues, formatValorTasa, tasaSchema } from "@/lib/validation/tasas";
import { CONCEPTOS_SINTETICOS } from "@/lib/payroll/conceptosSinteticos";
import { parsearFormula } from "@/lib/payroll/formula";
import { Role } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/empresas";

type ClaveTasaKey = (typeof claveTasaValues)[number];

function esClaveTasa(clave: string): clave is ClaveTasaKey {
  return (claveTasaValues as readonly string[]).includes(clave);
}

export type SegmentoFormulaResuelto =
  | { tipo: "texto"; texto: string }
  | { tipo: "tasa"; clave: ClaveTasaKey; label: string; valorFormateado: string };

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

/**
 * Fórmula de cada concepto que el motor calcula automáticamente (ver
 * `CONCEPTOS_SINTETICOS`), con las tasas que la componen resueltas a su valor vigente —
 * para que el contador vea de dónde sale cada línea del recibo y, desde ahí, pueda ir a
 * modificar la tasa (Configuración → Tasas laborales es la única fuente editable; acá solo
 * se muestra, nunca se recalcula el motor con otra fórmula).
 */
export async function listarFormulasConceptos() {
  try {
    await requireRole(Role.CONTADOR, Role.ASISTENTE);
    const tasas = await listarTasasVigentes();
    if (!tasas.ok) return tasas;
    const valorPorClave = new Map(tasas.data.map((t) => [t.clave, t.valor.toString()] as const));

    const data = CONCEPTOS_SINTETICOS.map((concepto) => ({
      codigo: concepto.codigo,
      nombre: concepto.nombre,
      tipo: concepto.tipo,
      segmentos: parsearFormula(concepto.formula).map((s): SegmentoFormulaResuelto => {
        if (s.tipo === "texto") return s;
        if (!esClaveTasa(s.clave)) {
          throw new Error(`La fórmula de "${concepto.codigo}" referencia una clave desconocida: "${s.clave}".`);
        }
        const valor = valorPorClave.get(s.clave);
        return {
          tipo: "tasa",
          clave: s.clave,
          label: CLAVE_TASA_LABEL[s.clave],
          valorFormateado: valor !== undefined ? formatValorTasa(s.clave, valor) : "sin configurar",
        };
      }),
    }));

    return { ok: true as const, data };
  } catch (err) {
    return { ok: false as const, error: err instanceof AuthzError ? err.message : "Error al listar fórmulas." };
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
    revalidatePath("/configuracion/formulas");
    return { ok: true, data: { id: nueva.id } };
  } catch (err) {
    return { ok: false, error: err instanceof AuthzError ? err.message : "Error al actualizar la tasa." };
  }
}
