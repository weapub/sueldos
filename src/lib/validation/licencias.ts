import { z } from "zod";

export const tipoLicenciaValues = [
  "ENFERMEDAD_INCULPABLE",
  "ACCIDENTE_TRABAJO",
  "MATERNIDAD",
  "LICENCIA_ESPECIAL",
  "SUSPENSION",
  "SIN_GOCE",
  "OTRA",
] as const;

export const TIPO_LICENCIA_LABEL: Record<(typeof tipoLicenciaValues)[number], string> = {
  ENFERMEDAD_INCULPABLE: "Enfermedad inculpable (art. 208)",
  ACCIDENTE_TRABAJO: "Accidente de trabajo (ART)",
  MATERNIDAD: "Maternidad",
  LICENCIA_ESPECIAL: "Licencia especial (art. 158)",
  SUSPENSION: "Suspensión",
  SIN_GOCE: "Sin goce de haberes",
  OTRA: "Otra",
};

/** Con goce por defecto según el tipo (el contador puede cambiarlo). */
export const CON_GOCE_DEFAULT: Record<(typeof tipoLicenciaValues)[number], boolean> = {
  ENFERMEDAD_INCULPABLE: true,
  ACCIDENTE_TRABAJO: true,
  MATERNIDAD: false,
  LICENCIA_ESPECIAL: true,
  SUSPENSION: false,
  SIN_GOCE: false,
  OTRA: true,
};

export const licenciaSchema = z
  .object({
    tipo: z.enum(tipoLicenciaValues),
    desde: z.string().min(1, "Ingresá la fecha de inicio."),
    hasta: z.string().min(1, "Ingresá la fecha de fin."),
    conGoce: z.coerce.boolean().default(false),
    observaciones: z.string().trim().optional().or(z.literal("")),
  })
  .refine((v) => new Date(v.hasta) >= new Date(v.desde), {
    message: "La fecha de fin no puede ser anterior al inicio.",
    path: ["hasta"],
  });

export type LicenciaInput = z.infer<typeof licenciaSchema>;
