import { z } from "zod";

export const gananciasParametroSchema = z.object({
  mni: z.coerce.number().min(0),
  deduccionEspecial: z.coerce.number().min(0),
  deduccionConyuge: z.coerce.number().min(0).default(0),
  deduccionHijo: z.coerce.number().min(0).default(0),
  vigenciaDesde: z.string().min(1, "Ingresá la fecha de vigencia."),
});
export type GananciasParametroInput = z.infer<typeof gananciasParametroSchema>;

export const gananciasTramoSchema = z
  .object({
    parametroId: z.string().min(1),
    desde: z.coerce.number().min(0),
    hasta: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.coerce.number().positive().optional(),
    ),
    montoFijo: z.coerce.number().min(0).default(0),
    porcentaje: z.coerce.number().min(0).max(1),
    orden: z.coerce.number().int().min(0).default(0),
  })
  .refine((v) => v.hasta === undefined || v.hasta > v.desde, {
    message: "El tope superior debe ser mayor al inferior.",
    path: ["hasta"],
  });
export type GananciasTramoInput = z.infer<typeof gananciasTramoSchema>;

export const gananciasLegajoConfigSchema = z.object({
  liquidaGanancias: z.coerce.boolean().default(false),
  computaConyuge: z.coerce.boolean().default(false),
  cantidadHijosACargo: z.coerce.number().int().min(0).default(0),
  otrasDeduccionesMensuales: z.coerce.number().min(0).default(0),
});
export type GananciasLegajoConfigInput = z.infer<typeof gananciasLegajoConfigSchema>;
