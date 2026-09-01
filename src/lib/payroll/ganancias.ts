import { type Money, ZERO, money, round2, max as moneyMax } from "./money";

export interface GananciasTramo {
  desde: Money;
  hasta: Money | null;
  montoFijo: Money;
  porcentaje: Money; // fracción
}

export interface GananciasParametroInput {
  mni: Money;
  deduccionEspecial: Money;
  deduccionConyuge: Money;
  deduccionHijo: Money;
  tramos: GananciasTramo[]; // valores anuales
}

export interface GananciasAcumuladoPrevio {
  gananciaNetaAcum: Money;
  retenidoAcum: Money;
}

export interface RetencionGananciasInput {
  /** Mes del período (1..12). El cálculo es acumulado y se prorratea × mes/12. */
  mes: number;
  esMesSAC: boolean;
  /** Remuneración bruta gravada del mes (remunerativo, SAC incluido si corresponde). */
  remBrutaMes: Money;
  /** Aportes obligatorios + cuota sindical del mes (deducciones generales). */
  deduccionesGeneralesMes: Money;
  /** Deducciones personales mensuales del legajo (alquiler, médicos, etc. — ya topeadas). */
  otrasDeduccionesMes: Money;
  computaConyuge: boolean;
  cantidadHijos: number;
  acumPrevio: GananciasAcumuladoPrevio;
  parametro: GananciasParametroInput;
}

export interface RetencionGananciasResult {
  /** Retención del mes ( > 0 = se retiene; < 0 = corresponde devolución). */
  retencionMes: Money;
  gananciaNetaMes: Money;
  gananciaNetaAcum: Money;
  deduccionesPersonalesAcum: Money;
  gananciaSujetaImpuesto: Money;
  impuestoDeterminadoAcum: Money;
  retenidoAcum: Money;
  warnings: string[];
}

/**
 * Retención mensual de Impuesto a las Ganancias (4ta categoría), método de cálculo
 * ACUMULADO (RG 4003): se acumula la ganancia neta del año, se restan las deducciones
 * personales prorrateadas al mes, se aplica la escala del art. 94 (también prorrateada) y
 * la retención del mes es el impuesto acumulado menos lo ya retenido.
 *
 * Simplificaciones de esta versión (documentadas):
 * - El SAC del mes se toma como parte de `remBrutaMes` y se suma 1/12 extra de deducciones
 *   personales (aproxima la "deducción especial SAC").
 * - Escala y deducciones personales anuales prorrateadas linealmente por `mes/12`.
 * - No contempla pluriempleo ni ajustes de retenciones de otros agentes.
 */
export function calcularRetencionGanancias(
  input: RetencionGananciasInput,
): RetencionGananciasResult {
  const warnings: string[] = [];
  const factorAnual = money(input.mes).div(12);

  const gananciaNetaMes = input.remBrutaMes
    .minus(input.deduccionesGeneralesMes)
    .minus(input.otrasDeduccionesMes);
  const gananciaNetaAcum = input.acumPrevio.gananciaNetaAcum.plus(gananciaNetaMes);

  const p = input.parametro;
  const deduccionesPersonalesAnuales = p.mni
    .plus(p.deduccionEspecial)
    .plus(input.computaConyuge ? p.deduccionConyuge : ZERO)
    .plus(p.deduccionHijo.times(Math.max(input.cantidadHijos, 0)));

  let deduccionesPersonalesAcum = round2(deduccionesPersonalesAnuales.times(factorAnual));
  if (input.esMesSAC) {
    // 1/12 adicional por el SAC del mes (deducción especial proporcional al aguinaldo).
    deduccionesPersonalesAcum = round2(
      deduccionesPersonalesAcum.plus(deduccionesPersonalesAnuales.div(12)),
    );
  }

  const gananciaSujetaImpuesto = moneyMax(gananciaNetaAcum.minus(deduccionesPersonalesAcum), ZERO);

  if (p.tramos.length === 0) {
    warnings.push("Falta cargar la escala del art. 94 en Configuración → Ganancias.");
  }

  // Escala prorrateada al mes.
  let impuestoDeterminadoAcum = ZERO;
  const tramosOrden = [...p.tramos].sort((a, b) => a.desde.minus(b.desde).toNumber());
  for (const t of tramosOrden) {
    const desdeP = t.desde.times(factorAnual);
    const hastaP = t.hasta ? t.hasta.times(factorAnual) : null;
    if (gananciaSujetaImpuesto.gte(desdeP) && (hastaP === null || gananciaSujetaImpuesto.lte(hastaP))) {
      impuestoDeterminadoAcum = round2(
        t.montoFijo
          .times(factorAnual)
          .plus(gananciaSujetaImpuesto.minus(desdeP).times(t.porcentaje)),
      );
      break;
    }
  }

  const retenidoAcum = moneyMax(impuestoDeterminadoAcum, ZERO);
  const retencionMes = round2(retenidoAcum.minus(input.acumPrevio.retenidoAcum));

  return {
    retencionMes,
    gananciaNetaMes,
    gananciaNetaAcum,
    deduccionesPersonalesAcum,
    gananciaSujetaImpuesto,
    impuestoDeterminadoAcum,
    retenidoAcum,
    warnings,
  };
}
