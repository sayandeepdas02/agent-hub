import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";

const schema = z.object({ workspaceId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: parsed.data.workspaceId,
        userId: ctx.userId,
      },
    },
    include: { workspace: { select: { id: true, name: true } } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  return NextResponse.json({
    workspaceId: membership.workspaceId,
    workspaceName: membership.workspace.name,
    role: membership.role,
  });
}
