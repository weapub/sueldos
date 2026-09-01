import { z } from "zod";

/** Una hora extra del período (se guarda en `snapshotInputJson.horasExtra`). */
export const horaExtraSchema = z.object({
  horas: z.coerce.number().positive("Ingresá las horas."),
  recargo: z.union([z.literal(50), z.literal(100)]),
  modalidad: z.enum(["PAGO", "BANCO_HORAS", "FRANCO_COMPENSATORIO"]),
});

export type HoraExtraInput = z.infer<typeof horaExtraSchema>;
