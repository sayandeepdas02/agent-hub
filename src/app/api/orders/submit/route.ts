import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestOrder } from "@/lib/agents/order-intake/ingest";

export async function POST(req: NextRequest) {
  const body = await req.json() as { text?: string };

  if (!body.text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const workspace = await prisma.workspace.findFirst();
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const order = await ingestOrder({
    id: "",
    workspaceId: workspace.id,
    source: "form",
    text: body.text.trim(),
    attachments: [],
    metadata: {},
  });

  return NextResponse.json({ orderId: order.id, status: order.status });
}
