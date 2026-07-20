import { z } from "zod";

export const claveTasaValues = [
  "APORTE_JUBILACION",
  "APORTE_LEY19032_PAMI",
  "APORTE_OBRA_SOCIAL",
  "CONTRIB_JUBILACION",
  "CONTRIB_LEY19032",
  "CONTRIB_OBRA_SOCIAL",
  "CONTRIB_ART",
  "CONTRIB_SINDICAL",
  "CONTRIB_ASIG_FAMILIARES",
  "CONTRIB_FNE",
  "DEDUCCION_FAECYS",
  "DEDUCCION_IPS_FSA",
  "FAL_GRANDE",
  "FAL_PYME",
  "TOPE_DEDUCCION_GENERAL",
  "TOPE_DEDUCCION_SINDICAL",
  "ART_FFEP_FIJO",
  "SVO_FIJO",
  "APORTE_SOLIDARIO_OSECAC_FIJO",
  "DETRACCION_ART22_CON_SAC",
  "DETRACCION_ART22_SIN_SAC",
  "DETRACCION_ART23_CONTRIBUCIONES",
  "RIFL_REDUCCION_CONTRIBUCIONES",
] as const;

export const CLAVE_TASA_LABEL: Record<(typeof claveTasaValues)[number], string> = {
  APORTE_JUBILACION: "Aporte jubilación (trabajador)",
  APORTE_LEY19032_PAMI: "Aporte Ley 19.032 (PAMI)",
  APORTE_OBRA_SOCIAL: "Aporte obra social (trabajador)",
  CONTRIB_JUBILACION: "Contribución jubilación (empleador)",
  CONTRIB_LEY19032: "Contribución Ley 19.032 (empleador)",
  CONTRIB_OBRA_SOCIAL: "Contribución obra social (empleador)",
  CONTRIB_ART: "Contribución ART (%)",
  CONTRIB_SINDICAL: "Deducción sindical (SINDICATO, %)",
  CONTRIB_ASIG_FAMILIARES: "Contribución asignaciones familiares",
  CONTRIB_FNE: "Contribución Fondo Nacional de Empleo",
  DEDUCCION_FAECYS: "Deducción FAECYS",
  DEDUCCION_IPS_FSA: "Deducción IPS FSA (provincial)",
  FAL_GRANDE: "FAL — Empresa grande",
  FAL_PYME: "FAL — PyME",
  TOPE_DEDUCCION_GENERAL: "Tope deducciones generales (art. 133)",
  TOPE_DEDUCCION_SINDICAL: "Tope deducción sindical (art. 133)",
  ART_FFEP_FIJO: "ART — cuota fija FFEP (monto fijo $)",
  SVO_FIJO: "SVO — seguro colectivo de vida obligatorio (monto fijo $)",
  APORTE_SOLIDARIO_OSECAC_FIJO: "Aporte solidario OSECAC (monto fijo $)",
  DETRACCION_ART22_CON_SAC: "Detracción art. 22 Ley 27.541 — con SAC (monto fijo $)",
  DETRACCION_ART22_SIN_SAC: "Detracción art. 22 Ley 27.541 — sin SAC (monto fijo $)",
  DETRACCION_ART23_CONTRIBUCIONES: "Detracción art. 23 Ley 27.541 — contribuciones (monto fijo $)",
  RIFL_REDUCCION_CONTRIBUCIONES: "RIFL — % de reducción de contribuciones patronales (sin reglamentar, default 0)",
};

/** Claves cuyo `valor` es un monto fijo en pesos, no una fracción/porcentaje. */
export const CLAVES_MONTO_FIJO = new Set<(typeof claveTasaValues)[number]>([
  "ART_FFEP_FIJO",
  "SVO_FIJO",
  "APORTE_SOLIDARIO_OSECAC_FIJO",
  "DETRACCION_ART22_CON_SAC",
  "DETRACCION_ART22_SIN_SAC",
  "DETRACCION_ART23_CONTRIBUCIONES",
]);

export const tasaSchema = z
  .object({
    clave: z.enum(claveTasaValues),
    valor: z.coerce.number().min(0),
    vigenciaDesde: z.string().min(1, "Ingresá la fecha de vigencia."),
  })
  .refine((v) => CLAVES_MONTO_FIJO.has(v.clave) || v.valor <= 1, {
    message: "El valor debe expresarse como fracción (ej. 0.11 = 11%), máximo 1.",
    path: ["valor"],
  });

export type TasaInput = z.infer<typeof tasaSchema>;
