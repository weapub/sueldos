import { type Money, ZERO, round2, sum, max } from "./money";
import type { ConceptoInput, ConceptoOutput, TasasVigentes } from "./types";

export interface TopeDeduccionesResult {
  deducciones: ConceptoOutput[];
  totalDeducciones: Money;
  warnings: string[];
}

/**
 * Art. 133: deducciones (sin contar aportes obligatorios ni embargos) topeadas al
 * `topeDeduccionGeneral` (por defecto 20%) del total de haberes; la deducción sindical
 * tiene su propio tope (`topeDeduccionSindical`, por defecto 2%) dentro de ese total —
 * pero ese tope del 2% (Ley 27.802 §3.6) protege únicamente a los trabajadores NO
 * afiliados; si `afiliadoSindical=true` las deducciones sindicales se aplican íntegras.
 * Los embargos están excluidos de cualquier tope. Los conceptos que requieren
 * consentimiento explícito se bloquean si no fueron firmados.
 */
export function aplicarTopeDeducciones(
  totalHaberes: Money,
  propuestas: ConceptoInput[],
  tasas: TasasVigentes,
  afiliadoSindical: boolean,
): TopeDeduccionesResult {
  const warnings: string[] = [];
  const resultado: ConceptoOutput[] = [];

  const bloqueadas: ConceptoOutput[] = [];
  const utilizables: ConceptoInput[] = [];
  for (const c of propuestas) {
    if (c.requiereConsentimiento && !c.consentimientoFirmado) {
      bloqueadas.push({ ...c, montoAjustado: ZERO, bloqueado: true, motivoBloqueo: "Falta consentimiento explícito (art. 133)." });
      warnings.push(`Deducción "${c.nombre}" bloqueada: falta consentimiento explícito.`);
    } else {
      utilizables.push(c);
    }
  }

  const embargos = utilizables.filter((c) => c.subtipo === "EMBARGO");
  const sindicales = utilizables.filter((c) => c.subtipo === "SINDICAL");
  const otras = utilizables.filter((c) => c.subtipo !== "EMBARGO" && c.subtipo !== "SINDICAL");

  // Embargos: sin tope.
  for (const c of embargos) resultado.push({ ...c, montoAjustado: c.monto });

  // Sindicales: topeadas individualmente al tope sindical, solo para NO afiliados.
  const topeSindical = round2(totalHaberes.times(tasas.topeDeduccionSindical));
  const totalSindicalPropuesto = sum(sindicales.map((c) => c.monto));
  const factorSindical =
    !afiliadoSindical && totalSindicalPropuesto.gt(topeSindical) && totalSindicalPropuesto.gt(0)
      ? topeSindical.div(totalSindicalPropuesto)
      : null;
  if (factorSindical) {
    warnings.push(
      `Deducciones sindicales recortadas de $${totalSindicalPropuesto.toFixed(2)} a $${topeSindical.toFixed(2)} (tope art. 133).`,
    );
  }
  for (const c of sindicales) {
    resultado.push({ ...c, montoAjustado: factorSindical ? round2(c.monto.times(factorSindical)) : c.monto });
  }

  // Resto de deducciones ("otras" + sindicales ya ajustadas) topeadas en conjunto al tope general.
  const totalSindicalAjustado = sum(resultado.filter((c) => c.subtipo === "SINDICAL").map((c) => c.montoAjustado));
  const topeGeneral = round2(totalHaberes.times(tasas.topeDeduccionGeneral));
  const totalOtrasPropuesto = sum(otras.map((c) => c.monto));
  const disponibleParaOtras = topeGeneral.minus(totalSindicalAjustado);
  const factorOtras =
    totalOtrasPropuesto.gt(disponibleParaOtras) && totalOtrasPropuesto.gt(0)
      ? max(disponibleParaOtras, ZERO).div(totalOtrasPropuesto)
      : null;
  if (factorOtras) {
    warnings.push(
      `Deducciones generales recortadas de $${totalOtrasPropuesto.toFixed(2)} a $${max(disponibleParaOtras, ZERO).toFixed(2)} (tope 20% art. 133).`,
    );
  }
  for (const c of otras) {
    resultado.push({ ...c, montoAjustado: factorOtras ? round2(c.monto.times(factorOtras)) : c.monto });
  }

  const todas = [...resultado, ...bloqueadas];
  return {
    deducciones: todas,
    totalDeducciones: sum(resultado.map((c) => c.montoAjustado)),
    warnings,
  };
}
