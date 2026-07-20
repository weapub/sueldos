import { z } from "zod";

export const motivoDesvinculacionValues = [
  "DESPIDO_SIN_CAUSA",
  "DESPIDO_CON_CAUSA",
  "RENUNCIA",
  "MUTUO_ACUERDO",
  "FALLECIMIENTO",
  "VENCIMIENTO_CONTRATO",
] as const;

export const MOTIVO_LABEL: Record<(typeof motivoDesvinculacionValues)[number], string> = {
  DESPIDO_SIN_CAUSA: "Despido sin causa",
  DESPIDO_CON_CAUSA: "Despido con causa",
  RENUNCIA: "Renuncia",
  MUTUO_ACUERDO: "Mutuo acuerdo",
  FALLECIMIENTO: "Fallecimiento",
  VENCIMIENTO_CONTRATO: "Vencimiento de contrato",
};

export const vinculoBeneficiarioValues = [
  "CONYUGE_CONVIVIENTE",
  "HIJO_MENOR",
  "HIJO_DISCAPACITADO",
  "PADRE_MADRE",
] as const;

export const VINCULO_LABEL: Record<(typeof vinculoBeneficiarioValues)[number], string> = {
  CONYUGE_CONVIVIENTE: "Cónyuge / conviviente",
  HIJO_MENOR: "Hijo/a menor",
  HIJO_DISCAPACITADO: "Hijo/a con discapacidad",
  PADRE_MADRE: "Padre / madre",
};

export const eventoDesvinculacionSchema = z.object({
  legajoId: z.string().min(1, "Elegí un legajo."),
  fechaEgreso: z.string().min(1, "Ingresá la fecha de egreso."),
  motivo: z.enum(motivoDesvinculacionValues),
  preavisoOtorgado: z.coerce.boolean().default(false),
});

export type EventoDesvinculacionInput = z.infer<typeof eventoDesvinculacionSchema>;
