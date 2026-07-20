import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export async function logAudit(params: {
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId: string;
  detalle?: Prisma.InputJsonValue;
}) {
  await db.auditLog.create({
    data: {
      usuarioId: params.usuarioId,
      accion: params.accion,
      entidad: params.entidad,
      entidadId: params.entidadId,
      detalleJson: params.detalle ?? {},
    },
  });
}
