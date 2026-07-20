import type { Money } from "./money";

/**
 * Tipos del motor de cálculo — deliberadamente desacoplados de los tipos generados
 * por Prisma. Las server actions mapean filas de la base de datos a estos tipos.
 */

export type TipoConcepto = "REMUNERATIVO" | "NO_REMUNERATIVO" | "DEDUCCION" | "CONTRIBUCION_PATRONAL";

export type SubtipoConcepto =
  | "BENEFICIO_SOCIAL_103BIS"
  | "NO_REMUN_105"
  | "DINAMICO_104BIS"
  | "SINDICAL"
  | "EMBARGO"
  | "OTRA_DEDUCCION";

export type ModalidadRemuneracion = "MENSUAL" | "JORNAL" | "HORA";

export interface ConceptoInput {
  /** Identificador estable (ConceptoDefinicion.id o clave sintética como "BASICO"/"SAC"). */
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoConcepto;
  subtipo?: SubtipoConcepto;
  monto: Money;
  cantidad?: Money;
  montoUnitario?: Money;
  afectaAportes: boolean;
  afectaContribuciones: boolean;
  /** Cuenta para la "mejor remuneración" usada en SAC e indemnización (art. 245). */
  afectaSAC: boolean;
  /** Ítem variable: para art. 245 se promedia (6 o 12 meses), no se toma el valor puntual. */
  esVariable: boolean;
  requiereConsentimiento: boolean;
  consentimientoFirmado: boolean;
}

export interface ConceptoOutput extends ConceptoInput {
  /** Monto final aplicado tras recortes por tope (deducciones) — igual a `monto` si no hubo ajuste. */
  montoAjustado: Money;
  bloqueado?: boolean;
  motivoBloqueo?: string;
}

export interface TasasVigentes {
  aporteJubilacion: Money;
  aporteLey19032Pami: Money;
  aporteObraSocial: Money;
  contribJubilacion: Money;
  contribLey19032: Money;
  contribObraSocial: Money;
  contribArt: Money;
  contribAsigFamiliares: Money;
  contribFNE: Money;
  /** Cuota fija mensual de ART (ej. FFEP), no proporcional — se suma tal cual, sin prorratear por días. */
  artFfepFijo: Money;
  /** SVO (seguro colectivo de vida obligatorio) — contribución patronal de monto fijo por legajo. */
  svoFijo: Money;
  /** Deducción sindical (SINDICATO) sobre base remunerativa Y no remunerativa (misma tasa, distinta base). */
  contribSindical: Money;
  falGrande: Money;
  falPyme: Money;
  topeDeduccionGeneral: Money;
  topeDeduccionSindical: Money;
  /**
   * Reglas de convenio (opcionales de aplicar — ver LegajoMensualInput.antiguedadAnios y
   * CategoriaConvenio.remuneracionNoRemunerativa como disparadores). Todas tienen default
   * global sembrado, pero el motor solo las usa si el legajo/categoría trae los datos que
   * las activan (antigüedad, escala no remunerativa).
   */
  antiguedadPorcentajeAnio: Money;
  deduccionFaecys: Money;
  deduccionAporteProvincial: Money; // ej. IPS FSA (Formosa)
  aporteSolidarioFijo: Money; // ej. Aporte solidario OSECAC, monto fijo
  /** RIFL (Título XX Ley 27.802): % de reducción de contribuciones patronales. Default 0 — sin reglamentar. */
  riflReduccionContribuciones: Money;
}

export interface LegajoMensualInput {
  sueldoBasico: Money;
  /** Horas contratadas reales; si es part-time y < horasSemanalesFullTime, se prorratea (art. 92 ter). */
  horasSemanales?: Money;
  horasSemanalesFullTime: Money;
  modalidadRemuneracion: ModalidadRemuneracion;
  /** Años de antigüedad (calculados por el llamador desde fechaIngreso). Sin este dato no se calculan antigüedad/presentismo automáticos. */
  antiguedadAnios?: number;
  /**
   * Remunerativo NO remunerativo de escala (full-time), típicamente `CategoriaConvenio.remuneracionNoRemunerativa`.
   * Si está ausente o es 0, no se genera el espejo no remunerativo (adicional/antigüedad/presentismo/SAC NR).
   */
  remuneracionNoRemunerativa?: Money;
  /** Condiciona el tope del 2% de deducciones sindicales (art. 133 / Ley 27.802 §3.6): el tope solo protege a NO afiliados. Default true. */
  afiliadoSindical?: boolean;
  /** true si el legajo está dentro de la ventana RIFL (alta 01/05/2026-30/04/2027) — lo resuelve el llamador. */
  aplicaRIFL?: boolean;
}

export interface LiquidacionMensualInput {
  legajo: LegajoMensualInput;
  anio: number;
  mes: number;
  /** Días corridos del mes trabajados (para altas/bajas a mitad de mes). */
  diasTrabajados: number;
  diasEnMes: number;
  /** true si el período es junio o diciembre (o el mes de pago del SAC pactado). */
  esMesSAC: boolean;
  /**
   * Mejor remuneración mensual del semestre (ya calculada por el llamador a partir del
   * historial), usada como base del SAC = mejor/2. Requerida solo si esMesSAC=true.
   */
  mejorRemuneracionSemestre?: Money;
  /** Análogo a `mejorRemuneracionSemestre` pero para el espejo no remunerativo (SAC s/no remunerativos). */
  mejorNoRemuneracionSemestre?: Money;
  /** Presentismo corresponde este período (sin inasistencias injustificadas). Default true. */
  presentismoCorresponde?: boolean;
  /** Conceptos adicionales del período (básico se agrega automáticamente, no incluirlo acá). */
  conceptos: ConceptoInput[];
  tasas: TasasVigentes;
}

export interface LiquidacionMensualResult {
  conceptos: ConceptoOutput[];
  totalRemunerativo: Money;
  totalNoRemunerativo: Money;
  totalDeducciones: Money;
  totalContribucionesPatronales: Money;
  neto: Money;
  warnings: string[];
}
