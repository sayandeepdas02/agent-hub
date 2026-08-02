import type { MemberRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      workspaceId?: string;
      workspaceName?: string;
      role?: MemberRole;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    workspaceId?: string;
    workspaceName?: string;
    role?: MemberRole;
  }
}
