import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { MemberRole } from "@prisma/client";

export interface AuthContext {
  userId: string;
  workspaceId: string;
  role: MemberRole;
  workspaceName: string;
  userEmail: string;
  userName: string | null | undefined;
  userImage: string | null | undefined;
}

export async function requireAuth(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.workspaceId) redirect("/onboarding");

  return {
    userId: session.user.id,
    workspaceId: session.user.workspaceId,
    role: (session.user.role ?? "OPERATOR") as MemberRole,
    workspaceName: session.user.workspaceName ?? "My Workspace",
    userEmail: session.user.email,
    userName: session.user.name,
    userImage: session.user.image,
  };
}

export function canManageMembers(role: MemberRole): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

export function canApproveOrders(role: MemberRole): boolean {
  return role !== "VIEWER";
}
