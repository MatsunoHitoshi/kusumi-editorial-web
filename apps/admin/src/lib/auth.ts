export type UserRole = "admin" | "editor";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
}

export async function getSessionUser(): Promise<SessionUser> {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    throw new Error("unauthorized");
  }
  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role
  };
}

export function requireRole(user: SessionUser, role: UserRole): void {
  const roleWeight: Record<UserRole, number> = {
    editor: 1,
    admin: 2
  };
  if (roleWeight[user.role] < roleWeight[role]) {
    throw new Error("forbidden");
  }
}
