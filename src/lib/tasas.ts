import "server-only";
import { db } from "@/lib/db";
import { money, type Money } from "@/lib/payroll/money";
import type { TasasVigentes } from "@/lib/payroll/types";
import { ClaveTasa } from "@/generated/prisma/enums";

/**
 * Resuelve la tasa vigente a una fecha para una clave dada, con override por empresa
 * (si existe una fila con empresaId) cayendo al default global (empresaId null).
 */
async function resolverTasa(clave: ClaveTasa, empresaId: string, fecha: Date): Promise<Money> {
  const porEmpresa = await db.tasaLaboral.findFirst({
    where: {
      empresaId,
      clave,
      vigenciaDesde: { lte: fecha },
      OR: [{ vigenciaHasta: null }, { vigenciaHasta: { gt: fecha } }],
    },
    orderBy: { vigenciaDesde: "desc" },
  });
  if (porEmpresa) return money(porEmpresa.valor.toString());

  const global = await db.tasaLaboral.findFirst({
    where: {
      empresaId: null,
      clave,
      vigenciaDesde: { lte: fecha },
      OR: [{ vigenciaHasta: null }, { vigenciaHasta: { gt: fecha } }],
    },
    orderBy: { vigenciaDesde: "desc" },
  });
  if (!global) {
    throw new Error(`No hay una tasa vigente configurada para "${clave}" a la fecha ${fecha.toISOString()}.`);
  }
  return money(global.valor.toString());
}

export async function getTasasVigentes(empresaId: string, fecha: Date): Promise<TasasVigentes> {
  const [
    aporteJubilacion,
    aporteLey19032Pami,
    aporteObraSocial,
    contribJubilacion,
    contribLey19032,
    contribObraSocial,
    contribArt,
    contribSindical,
    falGrande,
    falPyme,
    topeDeduccionGeneral,
    topeDeduccionSindical,
    antiguedadPorcentajeAnio,
    deduccionFaecys,
    deduccionAporteProvincial,
    aporteSolidarioFijo,
    contribAsigFamiliares,
    contribFNE,
    artFfepFijo,
    svoFijo,
    riflReduccionContribuciones,
  ] = await Promise.all([
    resolverTasa(ClaveTasa.APORTE_JUBILACION, empresaId, fecha),
    resolverTasa(ClaveTasa.APORTE_LEY19032_PAMI, empresaId, fecha),
    resolverTasa(ClaveTasa.APORTE_OBRA_SOCIAL, empresaId, fecha),
    resolverTasa(ClaveTasa.CONTRIB_JUBILACION, empresaId, fecha),
    resolverTasa(ClaveTasa.CONTRIB_LEY19032, empresaId, fecha),
    resolverTasa(ClaveTasa.CONTRIB_OBRA_SOCIAL, empresaId, fecha),
    resolverTasa(ClaveTasa.CONTRIB_ART, empresaId, fecha),
    resolverTasa(ClaveTasa.CONTRIB_SINDICAL, empresaId, fecha),
    resolverTasa(ClaveTasa.FAL_GRANDE, empresaId, fecha),
    resolverTasa(ClaveTasa.FAL_PYME, empresaId, fecha),
    resolverTasa(ClaveTasa.TOPE_DEDUCCION_GENERAL, empresaId, fecha),
    resolverTasa(ClaveTasa.TOPE_DEDUCCION_SINDICAL, empresaId, fecha),
    resolverTasa(ClaveTasa.ANTIGUEDAD_PORCENTAJE_ANIO, empresaId, fecha),
    resolverTasa(ClaveTasa.DEDUCCION_FAECYS, empresaId, fecha),
    resolverTasa(ClaveTasa.DEDUCCION_IPS_FSA, empresaId, fecha),
    resolverTasa(ClaveTasa.APORTE_SOLIDARIO_OSECAC_FIJO, empresaId, fecha),
    resolverTasa(ClaveTasa.CONTRIB_ASIG_FAMILIARES, empresaId, fecha),
    resolverTasa(ClaveTasa.CONTRIB_FNE, empresaId, fecha),
    resolverTasa(ClaveTasa.ART_FFEP_FIJO, empresaId, fecha),
    resolverTasa(ClaveTasa.SVO_FIJO, empresaId, fecha),
    resolverTasa(ClaveTasa.RIFL_REDUCCION_CONTRIBUCIONES, empresaId, fecha),
  ]);

  return {
    aporteJubilacion,
    aporteLey19032Pami,
    aporteObraSocial,
    contribJubilacion,
    contribLey19032,
    contribObraSocial,
    contribArt,
    contribAsigFamiliares,
    contribFNE,
    artFfepFijo,
    svoFijo,
    contribSindical,
    falGrande,
    falPyme,
    topeDeduccionGeneral,
    topeDeduccionSindical,
    antiguedadPorcentajeAnio,
    deduccionFaecys,
    deduccionAporteProvincial,
    aporteSolidarioFijo,
    riflReduccionContribuciones,
  };
}
