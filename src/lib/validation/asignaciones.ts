import { z } from "zod";

export const vinculoFamiliarValues = [
  "HIJO",
  "HIJO_CON_DISCAPACIDAD",
  "CONYUGE",
  "OTRO",
] as const;

export const VINCULO_FAMILIAR_LABEL: Record<(typeof vinculoFamiliarValues)[number], string> = {
  HIJO: "Hijo/a",
  HIJO_CON_DISCAPACIDAD: "Hijo/a con discapacidad",
  CONYUGE: "Cónyuge / conviviente",
  OTRO: "Otro familiar a cargo",
};

export const familiarSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá el nombre."),
  vinculo: z.enum(vinculoFamiliarValues),
  fechaNacimiento: z.string().optional().or(z.literal("")),
  enEscolaridad: z.coerce.boolean().default(false),
});

export type FamiliarInput = z.infer<typeof familiarSchema>;

export const tipoAsignacionValues = [
  "HIJO",
  "HIJO_DISCAPACIDAD",
  "PRENATAL",
  "AYUDA_ESCOLAR",
] as const;

export const TIPO_ASIGNACION_LABEL: Record<(typeof tipoAsignacionValues)[number], string> = {
  HIJO: "Hijo",
  HIJO_DISCAPACIDAD: "Hijo con discapacidad",
  PRENATAL: "Prenatal",
  AYUDA_ESCOLAR: "Ayuda escolar anual",
};

export const escalaAsignacionSchema = z
  .object({
    tipo: z.enum(tipoAsignacionValues),
    zona: z.string().trim().min(1).default("GENERAL"),
    igfDesde: z.coerce.number().min(0).default(0),
    igfHasta: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.coerce.number().positive().optional(),
    ),
    monto: z.coerce.number().min(0),
    vigenciaDesde: z.string().min(1, "Ingresá la fecha de vigencia."),
  })
  .refine((v) => v.igfHasta === undefined || v.igfHasta >= v.igfDesde, {
    message: "El tope superior debe ser mayor al inferior.",
    path: ["igfHasta"],
  });

export type EscalaAsignacionInput = z.infer<typeof escalaAsignacionSchema>;
