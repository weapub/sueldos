import "server-only";
import { auth } from "@/lib/auth";
import { Role } from "@/generated/prisma/enums";

export class AuthzError extends Error {}

/** Devuelve la sesión activa o lanza si no hay usuario logueado. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new AuthzError("No autenticado.");
  return session;
}

/** Exige que el usuario tenga uno de los roles indicados. */
export async function requireRole(...roles: Role[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    throw new AuthzError("No tenés permisos para realizar esta acción.");
  }
  return session;
}

/**
 * Exige acceso a una empresa puntual: CONTADOR/ASISTENTE acceden a cualquiera,
 * CLIENTE solo a la empresa a la que está vinculado.
 */
export async function requireEmpresaAccess(empresaId: string) {
  const session = await requireSession();
  if (session.user.role === "CLIENTE" && session.user.empresaId !== empresaId) {
    throw new AuthzError("No tenés acceso a esta empresa.");
  }
  return session;
}

/** Exige que el usuario pueda escribir (CONTADOR o ASISTENTE), nunca CLIENTE. */
export async function requireEscritura(empresaId?: string) {
  const session = await requireRole(Role.CONTADOR, Role.ASISTENTE);
  if (empresaId) await requireEmpresaAccess(empresaId);
  return session;
}
