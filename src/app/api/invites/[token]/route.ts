import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { workspace: { select: { name: true } } },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Invite not found or expired" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    workspaceName: invite.workspace.name,
    workspaceId: invite.workspaceId,
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Invite not found or expired" },
      { status: 404 }
    );
  }

  if (session.user.email !== invite.email) {
    return NextResponse.json(
      { error: "This invite is for a different email address" },
      { status: 403 }
    );
  }

  await prisma.$transaction([
    prisma.workspaceMembership.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId: session.user.id,
        },
      },
      create: {
        workspaceId: invite.workspaceId,
        userId: session.user.id,
        role: invite.role,
      },
      update: { role: invite.role },
    }),
    prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ workspaceId: invite.workspaceId });
}
