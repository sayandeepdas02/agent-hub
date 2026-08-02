import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageMembers } from "@/lib/auth-utils";
import { z } from "zod";
import type { MemberRole } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ctx = await requireAuth();
  if (!canManageMembers(ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  const body = await req.json();
  const parsed = z
    .object({ role: z.enum(["ADMIN", "MANAGER", "REVIEWER", "OPERATOR", "VIEWER"]) })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const membership = await prisma.workspaceMembership.update({
    where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId } },
    data: { role: parsed.data.role as MemberRole },
  });

  return NextResponse.json(membership);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ctx = await requireAuth();
  if (!canManageMembers(ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;

  // Can't remove yourself
  if (userId === ctx.userId) {
    return NextResponse.json(
      { error: "You cannot remove yourself" },
      { status: 400 }
    );
  }

  await prisma.workspaceMembership.delete({
    where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId } },
  });

  return NextResponse.json({ ok: true });
}
