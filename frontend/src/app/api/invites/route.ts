import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageMembers } from "@/lib/auth-utils";
import { sendWorkspaceInvite } from "@/lib/mail";
import { z } from "zod";
import type { MemberRole } from "@prisma/client";

const VALID_ROLES: MemberRole[] = [
  "ADMIN",
  "MANAGER",
  "REVIEWER",
  "OPERATOR",
  "VIEWER",
];

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "REVIEWER", "OPERATOR", "VIEWER"]),
});

export async function GET() {
  const ctx = await requireAuth();
  const invites = await prisma.invite.findMany({
    where: { workspaceId: ctx.workspaceId, acceptedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invites);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();
  if (!canManageMembers(ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const { email, role } = parsed.data;

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const membership = await prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId: existingUser.id } },
    });
    if (membership) {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 409 }
      );
    }
  }

  // Upsert invite (resend if already pending)
  await prisma.invite.deleteMany({
    where: { workspaceId: ctx.workspaceId, email, acceptedAt: null },
  });

  const invite = await prisma.invite.create({
    data: {
      workspaceId: ctx.workspaceId,
      email,
      role: role as MemberRole,
      invitedById: ctx.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await sendWorkspaceInvite(
    email,
    ctx.userName ?? ctx.userEmail,
    ctx.workspaceName,
    invite.token
  ).catch(() => {});

  return NextResponse.json(invite, { status: 201 });
}
