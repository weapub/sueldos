import { z } from "zod";

export const tamanoEmpresaValues = ["MICRO", "PEQUENA", "MEDIANA", "GRANDE"] as const;

export const empresaSchema = z.object({
  razonSocial: z.string().trim().min(2, "Ingresá la razón social."),
  cuit: z
    .string()
    .trim()
    .regex(/^\d{2}-?\d{8}-?\d{1}$/, "CUIT inválido (formato 20-12345678-9)."),
  actividad: z.string().trim().min(2, "Ingresá la actividad."),
  tamano: z.enum(tamanoEmpresaValues),
  provincia: z.string().trim().min(2, "Ingresá la provincia."),
  direccion: z.string().trim().optional().or(z.literal("")),
});

export type EmpresaInput = z.infer<typeof empresaSchema>;
