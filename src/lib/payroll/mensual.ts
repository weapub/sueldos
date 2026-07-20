import { type Money, ZERO, money, round2, sum } from "./money";
import { esPartTime } from "./partTime";
import { calcularSAC } from "./sac";
import { calcularAntiguedadImporte, calcularPresentismo } from "./convenio";
import { aplicarTopeDeducciones } from "./deducciones";
import type { ConceptoInput, ConceptoOutput, LiquidacionMensualInput, LiquidacionMensualResult } from "./types";

const BASICO_CONCEPTO_ID = "BASICO";
const SAC_CONCEPTO_ID = "SAC";
const SAC_NR_CONCEPTO_ID = "SAC_NR";

// Códigos del catálogo real de Comercio 130/75 (GONZALEZ.xlsm, hoja CONCEPTOS) reutilizados
// para los conceptos que el motor genera automáticamente, así heredan la matriz de
// tributación/rubro ya cargada en el catálogo. El signo/base de aportes de estos conceptos
// SIGUE resolviéndose acá con las reglas del motor (ver notas en cada bloque), no se copia
// ciegamente del catálogo.
const ANTIGUEDAD_CODIGO = "10002";
const PRESENTISMO_CODIGO = "10003";
const ADICIONAL_NR_CODIGO = "20001";
const ANTIGUEDAD_NR_CODIGO = "20002";
const PRESENTISMO_NR_CODIGO = "20003";

/**
 * Prorratea un monto full-time por horas contratadas (art. 92 ter) y por días trabajados del
 * período, redondeando una sola vez al final (no en cada paso intermedio) para que el
 * resultado coincida con una fórmula de una sola celda tipo `((horas*monto)/horasFT)/díasMes*díasTrab`.
 */
function prorratear(
  montoFullTime: Money,
  horasSemanales: Money | undefined,
  horasSemanalesFullTime: Money,
  diasTrabajados: number,
  diasEnMes: number,
): Money {
  const esPT = esPartTime(horasSemanales, horasSemanalesFullTime);
  const montoPorHoras = esPT ? montoFullTime.times(horasSemanales!).div(horasSemanalesFullTime) : montoFullTime;
  return round2(montoPorHoras.times(diasTrabajados).div(diasEnMes));
}

/**
 * Motor de liquidación mensual (Ley 27.802). Función pura: no accede a la base de
 * datos ni a Next.js. El llamador (server action) resuelve legajo/tasas/histórico
 * y mapea a `LiquidacionMensualInput`.
 */
export function calcularLiquidacionMensual(input: LiquidacionMensualInput): LiquidacionMensualResult {
  const warnings: string[] = [];
  const legajo = input.legajo;

  // 1. Básico, prorrateado por part-time (art. 92 ter) y por días trabajados.
  const montoBasico = prorratear(
    legajo.sueldoBasico,
    legajo.horasSemanales,
    legajo.horasSemanalesFullTime,
    input.diasTrabajados,
    input.diasEnMes,
  );
  if (input.diasTrabajados !== input.diasEnMes) {
    warnings.push(`Básico prorrateado por días trabajados (${input.diasTrabajados}/${input.diasEnMes}).`);
  }

  const conceptoBasico: ConceptoInput = {
    id: BASICO_CONCEPTO_ID,
    codigo: "BASICO",
    nombre: "Sueldo básico",
    tipo: "REMUNERATIVO",
    monto: montoBasico,
    afectaAportes: true,
    afectaContribuciones: true,
    afectaSAC: true,
    esVariable: false,
    requiereConsentimiento: false,
    consentimientoFirmado: false,
  };

  // 2. Antigüedad y presentismo (fórmula CCT: antigüedad = básico × años × tasa;
  // presentismo = (básico + antigüedad) / 12). Solo se calculan si el llamador informó
  // los años de antigüedad del legajo — si no, se omiten (comportamiento previo intacto).
  const aplicaReglasConvenio = legajo.antiguedadAnios !== undefined;
  const conceptoAntiguedad: ConceptoInput | null = aplicaReglasConvenio
    ? {
        id: ANTIGUEDAD_CODIGO,
        codigo: ANTIGUEDAD_CODIGO,
        nombre: "Antigüedad",
        tipo: "REMUNERATIVO",
        monto: calcularAntiguedadImporte(montoBasico, legajo.antiguedadAnios!, input.tasas.antiguedadPorcentajeAnio),
        afectaAportes: true,
        afectaContribuciones: true,
        afectaSAC: true,
        esVariable: false,
        requiereConsentimiento: false,
        consentimientoFirmado: false,
      }
    : null;

  const presentismoCorresponde = input.presentismoCorresponde ?? true;
  const conceptoPresentismo: ConceptoInput | null =
    aplicaReglasConvenio && presentismoCorresponde
      ? {
          id: PRESENTISMO_CODIGO,
          codigo: PRESENTISMO_CODIGO,
          nombre: "Presentismo",
          tipo: "REMUNERATIVO",
          monto: calcularPresentismo(montoBasico, conceptoAntiguedad!.monto),
          afectaAportes: true,
          afectaContribuciones: true,
          afectaSAC: true,
          esVariable: false,
          requiereConsentimiento: false,
          consentimientoFirmado: false,
        }
      : null;

  // 3. SAC (art. 245 lo excluye de su propia base: afectaSAC=false).
  const conceptoSAC: ConceptoInput | null = input.esMesSAC
    ? (() => {
        if (!input.mejorRemuneracionSemestre) {
          throw new Error("mejorRemuneracionSemestre es requerido cuando esMesSAC=true.");
        }
        return {
          id: SAC_CONCEPTO_ID,
          codigo: "SAC",
          nombre: "SAC (aguinaldo)",
          tipo: "REMUNERATIVO" as const,
          monto: calcularSAC(input.mejorRemuneracionSemestre),
          afectaAportes: true,
          afectaContribuciones: true,
          afectaSAC: false,
          esVariable: false,
          requiereConsentimiento: false,
          consentimientoFirmado: false,
        };
      })()
    : null;

  // 4. Espejo no remunerativo (adicional/antigüedad/presentismo/SAC de escala NO remunerativa)
  // — solo si la categoría tiene un NO remunerativo de escala cargado. Estos conceptos NUNCA
  // afectan aportes de SIPA/INSSJyP (`afectaAportes=false`): el no remunerativo solo tributa a
  // obra social, que se modela como una deducción aparte ("OBRA SOCIAL NO REM.") más abajo, no
  // dentro del bloque de aportes 11%+3%+6% que ya cubre exclusivamente al remunerativo.
  const tieneNoRemunerativo = legajo.remuneracionNoRemunerativa !== undefined && legajo.remuneracionNoRemunerativa.gt(0);

  const conceptoAdicionalNR: ConceptoInput | null = tieneNoRemunerativo
    ? {
        id: ADICIONAL_NR_CODIGO,
        codigo: ADICIONAL_NR_CODIGO,
        nombre: "Adicional no remunerativo",
        tipo: "NO_REMUNERATIVO",
        monto: prorratear(
          legajo.remuneracionNoRemunerativa!,
          legajo.horasSemanales,
          legajo.horasSemanalesFullTime,
          input.diasTrabajados,
          input.diasEnMes,
        ),
        afectaAportes: false,
        afectaContribuciones: true,
        afectaSAC: false,
        esVariable: false,
        requiereConsentimiento: false,
        consentimientoFirmado: false,
      }
    : null;

  const conceptoAntiguedadNR: ConceptoInput | null =
    tieneNoRemunerativo && aplicaReglasConvenio
      ? {
          id: ANTIGUEDAD_NR_CODIGO,
          codigo: ANTIGUEDAD_NR_CODIGO,
          nombre: "Antigüedad no remunerativo",
          tipo: "NO_REMUNERATIVO",
          monto: calcularAntiguedadImporte(conceptoAdicionalNR!.monto, legajo.antiguedadAnios!, input.tasas.antiguedadPorcentajeAnio),
          afectaAportes: false,
          afectaContribuciones: true,
          afectaSAC: false,
          esVariable: false,
          requiereConsentimiento: false,
          consentimientoFirmado: false,
        }
      : null;

  const conceptoPresentismoNR: ConceptoInput | null =
    tieneNoRemunerativo && aplicaReglasConvenio && presentismoCorresponde
      ? {
          id: PRESENTISMO_NR_CODIGO,
          codigo: PRESENTISMO_NR_CODIGO,
          nombre: "Presentismo no remunerativo",
          tipo: "NO_REMUNERATIVO",
          monto: calcularPresentismo(conceptoAdicionalNR!.monto, conceptoAntiguedadNR?.monto ?? ZERO),
          afectaAportes: false,
          afectaContribuciones: true,
          afectaSAC: false,
          esVariable: false,
          requiereConsentimiento: false,
          consentimientoFirmado: false,
        }
      : null;

  const conceptoSACNR: ConceptoInput | null =
    tieneNoRemunerativo && input.esMesSAC
      ? (() => {
          if (!input.mejorNoRemuneracionSemestre) {
            throw new Error("mejorNoRemuneracionSemestre es requerido cuando esMesSAC=true y hay NO remunerativo de escala.");
          }
          return {
            id: SAC_NR_CONCEPTO_ID,
            codigo: "SAC_NR",
            nombre: "SAC sobre no remunerativos",
            tipo: "NO_REMUNERATIVO" as const,
            monto: calcularSAC(input.mejorNoRemuneracionSemestre),
            afectaAportes: false,
            afectaContribuciones: true,
            afectaSAC: false,
            esVariable: false,
            requiereConsentimiento: false,
            consentimientoFirmado: false,
          };
        })()
      : null;

  const conceptosHaberes = [
    conceptoBasico,
    ...(conceptoAntiguedad ? [conceptoAntiguedad] : []),
    ...(conceptoPresentismo ? [conceptoPresentismo] : []),
    ...(conceptoSAC ? [conceptoSAC] : []),
    ...(conceptoAdicionalNR ? [conceptoAdicionalNR] : []),
    ...(conceptoAntiguedadNR ? [conceptoAntiguedadNR] : []),
    ...(conceptoPresentismoNR ? [conceptoPresentismoNR] : []),
    ...(conceptoSACNR ? [conceptoSACNR] : []),
    ...input.conceptos.filter((c) => c.tipo === "REMUNERATIVO" || c.tipo === "NO_REMUNERATIVO"),
  ];

  const remunerativos = conceptosHaberes.filter((c) => c.tipo === "REMUNERATIVO");
  const noRemunerativos = conceptosHaberes.filter((c) => c.tipo === "NO_REMUNERATIVO");

  const totalRemunerativo = sum(remunerativos.map((c) => c.monto));
  const totalNoRemunerativo = sum(noRemunerativos.map((c) => c.monto));
  const totalHaberes = totalRemunerativo.plus(totalNoRemunerativo);

  // 5. Aportes del trabajador sobre el remunerativo (jubilación 11% + ley 19.032 3% + obra social 6%).
  const baseAportes = sum(conceptosHaberes.filter((c) => c.afectaAportes).map((c) => c.monto));
  const tasaAportesTotal = input.tasas.aporteJubilacion.plus(input.tasas.aporteLey19032Pami).plus(input.tasas.aporteObraSocial);
  const montoAportes = round2(baseAportes.times(tasaAportesTotal));

  const conceptoAportes: ConceptoOutput = {
    id: "APORTES",
    codigo: "APORTES",
    nombre: "Aportes (jubilación + ley 19.032 + obra social)",
    tipo: "DEDUCCION",
    monto: montoAportes,
    montoAjustado: montoAportes,
    afectaAportes: false,
    afectaContribuciones: false,
    afectaSAC: false,
    esVariable: false,
    requiereConsentimiento: false,
    consentimientoFirmado: false,
  };

  // 6. Deducciones de convenio: sindicato/FAECYS/aporte provincial sobre el remunerativo,
  // y obra social/sindicato/FAECYS sobre el no remunerativo (mismas tasas, distinta base).
  // Solo se generan si corresponde (reglas de convenio activas / hay no remunerativo).
  const deduccionesConvenio: ConceptoInput[] = [];
  const nuevaDeduccion = (
    id: string,
    nombre: string,
    monto: Money,
    subtipo: ConceptoInput["subtipo"],
  ): ConceptoInput => ({
    id,
    codigo: id,
    nombre,
    tipo: "DEDUCCION",
    subtipo,
    monto,
    afectaAportes: false,
    afectaContribuciones: false,
    afectaSAC: false,
    esVariable: false,
    requiereConsentimiento: false,
    consentimientoFirmado: false,
  });

  if (aplicaReglasConvenio || tieneNoRemunerativo) {
    if (input.tasas.contribSindical.gt(0)) {
      deduccionesConvenio.push(
        nuevaDeduccion("30004", "Sindicato", round2(totalRemunerativo.times(input.tasas.contribSindical)), "SINDICAL"),
      );
    }
    if (input.tasas.deduccionFaecys.gt(0)) {
      deduccionesConvenio.push(
        nuevaDeduccion("30005", "FAECYS", round2(totalRemunerativo.times(input.tasas.deduccionFaecys)), "SINDICAL"),
      );
    }
    if (input.tasas.deduccionAporteProvincial.gt(0)) {
      deduccionesConvenio.push(
        nuevaDeduccion("30010", "Aporte previsional provincial", round2(totalRemunerativo.times(input.tasas.deduccionAporteProvincial)), undefined),
      );
    }
    if (input.tasas.aporteSolidarioFijo.gt(0)) {
      deduccionesConvenio.push(nuevaDeduccion("30006", "Aporte solidario", input.tasas.aporteSolidarioFijo, "SINDICAL"));
    }
    if (tieneNoRemunerativo) {
      if (input.tasas.aporteObraSocial.gt(0)) {
        deduccionesConvenio.push(
          nuevaDeduccion("30007", "Obra social no remunerativo", round2(totalNoRemunerativo.times(input.tasas.aporteObraSocial)), undefined),
        );
      }
      if (input.tasas.contribSindical.gt(0)) {
        deduccionesConvenio.push(
          nuevaDeduccion("30008", "Sindicato no remunerativo", round2(totalNoRemunerativo.times(input.tasas.contribSindical)), "SINDICAL"),
        );
      }
      if (input.tasas.deduccionFaecys.gt(0)) {
        deduccionesConvenio.push(
          nuevaDeduccion("30009", "FAECYS no remunerativo", round2(totalNoRemunerativo.times(input.tasas.deduccionFaecys)), "SINDICAL"),
        );
      }
    }
  }

  // 7. Otras deducciones del período (manuales) + las de convenio recién armadas, con topes del art. 133.
  const deduccionesPropuestas = [...deduccionesConvenio, ...input.conceptos.filter((c) => c.tipo === "DEDUCCION")];
  const {
    deducciones: deduccionesAjustadas,
    totalDeducciones: totalOtrasDeducciones,
    warnings: warningsDeducciones,
  } = aplicarTopeDeducciones(totalHaberes, deduccionesPropuestas, input.tasas, legajo.afiliadoSindical ?? true);
  warnings.push(...warningsDeducciones);

  const totalDeducciones = montoAportes.plus(totalOtrasDeducciones);

  // 8. Contribuciones patronales, desglosadas por concepto (Sección B del recibo Anexo III,
  // Dec. 407/2026 — "costo laboral total" expuesto por rubro). Informativas: no se descuentan
  // del neto (art. 140).
  const baseContribuciones = sum(conceptosHaberes.filter((c) => c.afectaContribuciones).map((c) => c.monto));
  const nuevaContribucion = (id: string, nombre: string, monto: Money): ConceptoOutput => ({
    id,
    codigo: id,
    nombre,
    tipo: "CONTRIBUCION_PATRONAL",
    monto,
    montoAjustado: monto,
    afectaAportes: false,
    afectaContribuciones: false,
    afectaSAC: false,
    esVariable: false,
    requiereConsentimiento: false,
    consentimientoFirmado: false,
  });

  // RIFL (Título XX Ley 27.802): reduce las contribuciones patronales para altas dentro de la
  // ventana del régimen. `riflReduccionContribuciones` es 0 por defecto (no reglamentado aún,
  // ver docs/GAP_ANALYSIS.md §3.4) — con 0 esto es un no-op hasta que se cargue la alícuota real.
  const factorRIFL =
    legajo.aplicaRIFL && input.tasas.riflReduccionContribuciones.gt(0)
      ? money(1).minus(input.tasas.riflReduccionContribuciones)
      : money(1);
  if (legajo.aplicaRIFL && input.tasas.riflReduccionContribuciones.gt(0)) {
    warnings.push(
      `Régimen RIFL aplicado: contribuciones patronales reducidas ${input.tasas.riflReduccionContribuciones.times(100)}%.`,
    );
  }

  const contribucionesPatronales: ConceptoOutput[] = [];
  const agregarContribucionSiCorresponde = (id: string, nombre: string, tasa: Money) => {
    if (tasa.lte(0)) return;
    contribucionesPatronales.push(nuevaContribucion(id, nombre, round2(baseContribuciones.times(tasa).times(factorRIFL))));
  };
  agregarContribucionSiCorresponde("CP_JUBILACION", "Contribución jubilación", input.tasas.contribJubilacion);
  agregarContribucionSiCorresponde("CP_LEY19032", "Contribución Ley 19.032", input.tasas.contribLey19032);
  agregarContribucionSiCorresponde("CP_OBRA_SOCIAL", "Contribución obra social", input.tasas.contribObraSocial);
  agregarContribucionSiCorresponde("CP_ASIG_FAMILIARES", "Contribución asignaciones familiares", input.tasas.contribAsigFamiliares);
  agregarContribucionSiCorresponde("CP_FNE", "Contribución Fondo Nacional de Empleo", input.tasas.contribFNE);

  // ART y SVO quedan fuera de la reducción RIFL (son seguros, no contribuciones a la seguridad
  // social) — ajustar si la reglamentación real del régimen dice lo contrario.
  const montoArt = round2(baseContribuciones.times(input.tasas.contribArt)).plus(input.tasas.artFfepFijo);
  if (montoArt.gt(0)) contribucionesPatronales.push(nuevaContribucion("CP_ART", "ART", montoArt));
  if (input.tasas.svoFijo.gt(0)) contribucionesPatronales.push(nuevaContribucion("CP_SVO", "SVO", input.tasas.svoFijo));

  const totalContribucionesPatronales = sum(contribucionesPatronales.map((c) => c.monto));

  const neto = totalHaberes.minus(totalDeducciones);

  const conceptosFinales: ConceptoOutput[] = [
    ...conceptosHaberes.map((c) => ({ ...c, montoAjustado: c.monto })),
    conceptoAportes,
    ...deduccionesAjustadas,
    ...contribucionesPatronales,
  ];

  return {
    conceptos: conceptosFinales,
    totalRemunerativo,
    totalNoRemunerativo,
    totalDeducciones,
    totalContribucionesPatronales,
    neto,
    warnings,
  };
}

export { BASICO_CONCEPTO_ID, SAC_CONCEPTO_ID, SAC_NR_CONCEPTO_ID };
