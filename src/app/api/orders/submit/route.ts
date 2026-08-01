import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestOrder } from "@/lib/agents/order-intake/ingest";

export async function POST(req: NextRequest) {
  const body = await req.json() as { text?: string; workspaceSlug?: string };

  if (!body.text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  // Accept an optional workspaceSlug for multi-workspace support.
  // Falls back to the first workspace if omitted (backwards-compatible for single-workspace setups).
  const workspace = body.workspaceSlug
    ? await prisma.workspace.findUnique({ where: { slug: body.workspaceSlug } })
    : await prisma.workspace.findFirst();

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

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
