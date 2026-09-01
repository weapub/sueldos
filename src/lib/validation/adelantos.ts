import { z } from "zod";

export const adelantoSchema = z.object({
  fecha: z.string().min(1, "Ingresá la fecha."),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero."),
  observaciones: z.string().trim().optional().or(z.literal("")),
});

export type AdelantoInput = z.infer<typeof adelantoSchema>;
