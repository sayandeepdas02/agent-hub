import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { workspaceId } = await requireAuth();
  const { id } = await params;

  const webhook = await prisma.webhook.findFirst({ where: { id, workspaceId } });
  if (!webhook) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "50"), 200);

  const deliveries = await prisma.webhookDelivery.findMany({
    where: { webhookId: id },
    orderBy: { deliveredAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ deliveries });
}
