import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { MemberRole } from "@prisma/client";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma) as ReturnType<typeof PrismaAdapter>,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(1) })
          .safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user?.id) token.id = user.id;

      // Handle workspace switch via update()
      if (trigger === "update" && session?.workspaceId) {
        token.workspaceId = session.workspaceId;
        token.role = session.role;
        token.workspaceName = session.workspaceName;
      }

      // Load first membership on initial sign-in
      if (token.id && !token.workspaceId) {
        const membership = await prisma.workspaceMembership.findFirst({
          where: { userId: token.id as string },
          include: { workspace: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        });
        if (membership) {
          token.workspaceId = membership.workspaceId;
          token.role = membership.role;
          token.workspaceName = membership.workspace.name;
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.workspaceId = token.workspaceId as string | undefined;
      session.user.role = token.role as MemberRole | undefined;
      session.user.workspaceName = token.workspaceName as string | undefined;
      return session;
    },
  },
});
