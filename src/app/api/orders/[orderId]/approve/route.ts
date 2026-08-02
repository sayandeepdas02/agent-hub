import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { orderIntakeAgent, execute } from "@/lib/agents/order-intake";
import type { OrderOverrides } from "@/lib/agents/order-intake/execute";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "REVIEW_NEEDED") {
    return NextResponse.json({ error: "Order is not pending review" }, { status: 400 });
  }

  let overrides: OrderOverrides = {};
  try {
    const body = await req.json();
    overrides = body ?? {};
  } catch {
    // no body is fine
  }

  const result = await execute(orderId, order.workspaceId, overrides);

  await audit({
    workspaceId: order.workspaceId,
    agentId: orderIntakeAgent.id,
    action: "order.approved",
    details: { orderId, overrides, ...result },
  });

  return NextResponse.json({ ok: true, result });
}
