import { z } from "zod";

export const roleValues = ["CONTADOR", "ASISTENTE", "CLIENTE"] as const;

export const usuarioSchema = z
  .object({
    email: z.email("Email inválido."),
    nombre: z.string().trim().min(2, "Ingresá el nombre."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    role: z.enum(roleValues),
    empresaId: z.string().optional().or(z.literal("")),
  })
  .refine((v) => v.role !== "CLIENTE" || !!v.empresaId, {
    message: "Los usuarios cliente deben estar vinculados a una empresa.",
    path: ["empresaId"],
  });

export type UsuarioInput = z.infer<typeof usuarioSchema>;
