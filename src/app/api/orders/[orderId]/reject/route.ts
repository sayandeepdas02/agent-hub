import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { orderIntakeAgent } from "@/lib/agents/order-intake";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const { reason } = await req.json();

  if (!reason?.trim()) {
    return NextResponse.json({ error: "Reason is required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "FAILED" },
  });

  await audit({
    workspaceId: order.workspaceId,
    agentId: orderIntakeAgent.id,
    action: "order.rejected",
    details: { orderId, reason },
  });

  return NextResponse.json({ ok: true });
}
