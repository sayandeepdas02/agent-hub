import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { MemberRole } from "@prisma/client";

// Edge-safe config: no Prisma adapter, no bcrypt.
// Used only in proxy.ts for JWT validation.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  providers: [
    // Providers listed here only to satisfy NextAuth config shape.
    // Actual authorization logic lives in src/auth.ts.
    Google({ clientId: process.env.GOOGLE_CLIENT_ID ?? "", clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "" }),
    Credentials({ credentials: {}, authorize: () => null }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.workspaceId = token.workspaceId as string | undefined;
      session.user.role = token.role as MemberRole | undefined;
      session.user.workspaceName = token.workspaceName as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/onboarding",
  },
};
