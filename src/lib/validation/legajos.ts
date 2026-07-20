import { z } from "zod";

export const tipoContratoValues = [
  "TIEMPO_INDETERMINADO",
  "PLAZO_FIJO",
  "TEMPORADA",
  "PART_TIME",
  "EVENTUAL",
] as const;

export const modalidadRemuneracionValues = ["MENSUAL", "JORNAL", "HORA"] as const;

export const categoriaConvenioSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá el nombre de la categoría."),
  convenioNombre: z.string().trim().optional().or(z.literal("")),
  salarioBaseConvenio: z.coerce.number().positive("El salario base debe ser mayor a 0."),
  vigenciaDesde: z.string().min(1, "Ingresá la fecha de vigencia."),
});

export type CategoriaConvenioInput = z.infer<typeof categoriaConvenioSchema>;

export const legajoSchema = z.object({
  numeroLegajo: z.coerce.number().int().positive("Número de legajo inválido."),
  nombre: z.string().trim().min(1, "Ingresá el nombre."),
  apellido: z.string().trim().min(1, "Ingresá el apellido."),
  cuil: z
    .string()
    .trim()
    .regex(/^\d{2}-?\d{7,8}-?\d{1}$/, "CUIL inválido (formato 20-12345678-9)."),
  fechaNacimiento: z.string().min(1, "Ingresá la fecha de nacimiento."),
  fechaIngreso: z.string().min(1, "Ingresá la fecha de ingreso."),
  categoriaId: z.string().min(1, "Elegí una categoría."),
  tipoContrato: z.enum(tipoContratoValues),
  modalidadRemuneracion: z.enum(modalidadRemuneracionValues),
  horasSemanales: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().positive().optional(),
  ),
  horasSemanalesFullTime: z.coerce.number().positive().default(48),
  sueldoBasico: z.coerce.number().positive("El sueldo básico debe ser mayor a 0."),
  obraSocial: z.string().trim().optional().or(z.literal("")),
  afiliadoSindical: z.coerce.boolean().default(false),
  regimenRIFL: z.coerce.boolean().default(false),
  regimenRIFLFechaAlta: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().optional(),
  ),
});

export type LegajoInput = z.infer<typeof legajoSchema>;
