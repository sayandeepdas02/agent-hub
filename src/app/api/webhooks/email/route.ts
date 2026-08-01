import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestOrder } from "@/lib/agents/order-intake/ingest";

export async function POST(req: NextRequest) {
  const payload = await req.json();

  // Resend inbound parse format
  const text = payload.text ?? payload.html ?? "";
  const subject = payload.subject ?? "";
  const from = payload.from ?? "";

  const workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }

  await ingestOrder({
    id: crypto.randomUUID(),
    workspaceId: workspace.id,
    source: "email",
    text: `Subject: ${subject}\nFrom: ${from}\n\n${text}`,
    attachments: [],
    metadata: { from, subject },
  });

  return NextResponse.json({ ok: true });
}
