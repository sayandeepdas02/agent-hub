import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

export async function GET() {
  const ctx = await requireAuth();
  const members = await prisma.workspaceMembership.findMany({
    where: { workspaceId: ctx.workspaceId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(members);
}
