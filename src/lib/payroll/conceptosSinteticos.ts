import type {
  TipoConcepto,
  SubtipoConcepto,
  RubroRecibo,
} from "@/generated/prisma/enums";

/**
 * Conceptos "sintéticos": los que produce el motor de liquidación mensual
 * (`calcularLiquidacionMensual`) por su cuenta —básico, SAC, antigüedad,
 * presentismo, espejo no remunerativo, aportes, deducciones de convenio,
 * contribuciones patronales— y que NO salen del catálogo editable por el usuario.
 *
 * Cada línea que el motor calcula tiene que poder anclarse a un `ConceptoDefinicion`
 * global (`empresaId: null`) por `codigo` para persistirse como `ConceptoLiquidacion`.
 * Si esa fila no existe, la línea se perdía del detalle del recibo aunque su monto ya
 * estuviera sumado en los totales. Este registro es la fuente de verdad única:
 *   - el `seed` lo usa como red de seguridad (crea lo que falte),
 *   - la persistencia de la liquidación lo usa para autocrear lo que falte en vez de
 *     descartar el concepto en silencio.
 */
export type ConceptoSinteticoDef = {
  codigo: string;
  codigoArca?: string;
  nombre: string;
  tipo: TipoConcepto;
  subtipo?: SubtipoConcepto;
  rubroRecibo?: RubroRecibo;
  afectaAportes: boolean;
  afectaContribuciones: boolean;
  afectaSAC: boolean;
  ordenImpresion: number;
};

export const CONCEPTOS_SINTETICOS: ConceptoSinteticoDef[] = [
  // Haberes
  { codigo: "BASICO", nombre: "Sueldo básico", tipo: "REMUNERATIVO", afectaAportes: true, afectaContribuciones: true, afectaSAC: true, ordenImpresion: 1 },
  { codigo: "SAC", nombre: "SAC (aguinaldo)", tipo: "REMUNERATIVO", afectaAportes: true, afectaContribuciones: true, afectaSAC: false, ordenImpresion: 2 },
  { codigo: "SAC_NR", nombre: "SAC sobre no remunerativos", tipo: "NO_REMUNERATIVO", afectaAportes: false, afectaContribuciones: true, afectaSAC: false, ordenImpresion: 3 },
  { codigo: "10002", codigoArca: "160001", nombre: "ANTIGÜEDAD", tipo: "REMUNERATIVO", afectaAportes: true, afectaContribuciones: true, afectaSAC: true, ordenImpresion: 10 },
  { codigo: "10003", codigoArca: "170001", nombre: "PRESENTISMO", tipo: "REMUNERATIVO", afectaAportes: true, afectaContribuciones: true, afectaSAC: true, ordenImpresion: 11 },
  { codigo: "20001", codigoArca: "551000", nombre: "ADICIONAL NO REMUNERATIVO", tipo: "NO_REMUNERATIVO", afectaAportes: true, afectaContribuciones: true, afectaSAC: false, ordenImpresion: 12 },
  { codigo: "20002", codigoArca: "550000", nombre: "ANTIGÜEDAD NO REMUNERATIVO", tipo: "NO_REMUNERATIVO", afectaAportes: true, afectaContribuciones: true, afectaSAC: false, ordenImpresion: 13 },
  { codigo: "20003", codigoArca: "550000", nombre: "PRESENTISMO NO REMUNERATIVO", tipo: "NO_REMUNERATIVO", afectaAportes: true, afectaContribuciones: true, afectaSAC: false, ordenImpresion: 14 },
  { codigo: "40001", codigoArca: "120000", nombre: "HORAS EXTRA 50%", tipo: "REMUNERATIVO", afectaAportes: true, afectaContribuciones: true, afectaSAC: true, ordenImpresion: 15 },
  { codigo: "40002", codigoArca: "121000", nombre: "HORAS EXTRA 100%", tipo: "REMUNERATIVO", afectaAportes: true, afectaContribuciones: true, afectaSAC: true, ordenImpresion: 16 },

  // Deducciones obligatorias y de convenio
  { codigo: "APORTES", nombre: "Aportes (jubilación + ley 19.032 + obra social)", tipo: "DEDUCCION", afectaAportes: false, afectaContribuciones: false, afectaSAC: false, ordenImpresion: 90 },
  { codigo: "30004", codigoArca: "810004", nombre: "SINDICATO", tipo: "DEDUCCION", subtipo: "SINDICAL", rubroRecibo: "SINDICAL", afectaAportes: false, afectaContribuciones: false, afectaSAC: false, ordenImpresion: 91 },
  { codigo: "30005", codigoArca: "810004", nombre: "FAECYS", tipo: "DEDUCCION", subtipo: "SINDICAL", rubroRecibo: "SINDICAL", afectaAportes: false, afectaContribuciones: false, afectaSAC: false, ordenImpresion: 92 },
  { codigo: "30006", codigoArca: "810002", nombre: "APORTE SOLIDARIO OSECAC", tipo: "DEDUCCION", subtipo: "SINDICAL", rubroRecibo: "SINDICAL", afectaAportes: false, afectaContribuciones: false, afectaSAC: false, ordenImpresion: 93 },
  { codigo: "30007", codigoArca: "810002", nombre: "OBRA SOCIAL NO REM.", tipo: "DEDUCCION", rubroRecibo: "OBRA_SOCIAL", afectaAportes: false, afectaContribuciones: false, afectaSAC: false, ordenImpresion: 94 },
  { codigo: "30008", codigoArca: "810004", nombre: "SINDICATO NO REM", tipo: "DEDUCCION", subtipo: "SINDICAL", rubroRecibo: "SINDICAL", afectaAportes: false, afectaContribuciones: false, afectaSAC: false, ordenImpresion: 95 },
  { codigo: "30009", codigoArca: "810004", nombre: "FAECYS NO REM", tipo: "DEDUCCION", subtipo: "SINDICAL", rubroRecibo: "SINDICAL", afectaAportes: false, afectaContribuciones: false, afectaSAC: false, ordenImpresion: 96 },
  { codigo: "30010", codigoArca: "820000", nombre: "IPS FSA", tipo: "DEDUCCION", rubroRecibo: "SEGURIDAD_SOCIAL", afectaAportes: false, afectaContribuciones: false, afectaSAC: false, ordenImpresion: 97 },
  { codigo: "RET_GANANCIAS", codigoArca: "830000", nombre: "Retención Impuesto a las Ganancias", tipo: "DEDUCCION", afectaAportes: false, afectaContribuciones: false, afectaSAC: false, ordenImpresion: 98 },
  { codigo: "ADELANTO_SUELDO", codigoArca: "840000", nombre: "Adelanto de sueldo", tipo: "DEDUCCION", afectaAportes: false, afectaContribuciones: false, afectaSAC: false, ordenImpresion: 99 },

  // Contribuciones patronales (Sección B del recibo Anexo III)
  { codigo: "CP_JUBILACION", nombre: "Contribución jubilación (patronal)", tipo: "CONTRIBUCION_PATRONAL", rubroRecibo: "SEGURIDAD_SOCIAL", afectaAportes: false, afectaContribuciones: false, afectaSAC: false, ordenImpresion: 100 },
  { codigo: "CP_LEY19032", nombre: "Contribución Ley 19.032 (patronal)", tipo: "CONTRIBUCION_PATRONAL", rubroRecibo: "INSSJP_PAMI", afectaAportes: false, afectaContribuciones: false, afectaSAC: false, ordenImpresion: 101 },
  { codigo: "CP_OBRA_SOCIAL", nombre: "Contribución obra social (patronal)", tipo: "CONTRIBUCION_PATRONAL", rubroRecibo: "OBRA_SOCIAL", afectaAportes: false, afectaContribuciones: false, afectaSAC: false, ordenImpresion: 102 },
  { codigo: "CP_ASIG_FAMILIARES", nombre: "Contribución asignaciones familiares", tipo: "CONTRIBUCION_PATRONAL", rubroRecibo: "SEGURIDAD_SOCIAL", afectaAportes: false, afectaContribuciones: false, afectaSAC: false, ordenImpresion: 103 },
  { codigo: "CP_FNE", nombre: "Contribución Fondo Nacional de Empleo", tipo: "CONTRIBUCION_PATRONAL", rubroRecibo: "SEGURIDAD_SOCIAL", afectaAportes: false, afectaContribuciones: false, afectaSAC: false, ordenImpresion: 104 },
  { codigo: "CP_ART", nombre: "ART (alícuota + cuota fija FFEP)", tipo: "CONTRIBUCION_PATRONAL", rubroRecibo: "ART", afectaAportes: false, afectaContribuciones: false, afectaSAC: false, ordenImpresion: 105 },
  { codigo: "CP_SVO", nombre: "Seguro colectivo de vida obligatorio (SVO)", tipo: "CONTRIBUCION_PATRONAL", rubroRecibo: "OTROS_CONVENCIONALES", afectaAportes: false, afectaContribuciones: false, afectaSAC: false, ordenImpresion: 106 },
];

export const CODIGOS_SINTETICOS: string[] = CONCEPTOS_SINTETICOS.map((c) => c.codigo);

const PORCODIGO = new Map(CONCEPTOS_SINTETICOS.map((c) => [c.codigo, c] as const));

export function conceptoSinteticoPorCodigo(codigo: string): ConceptoSinteticoDef | undefined {
  return PORCODIGO.get(codigo);
}
