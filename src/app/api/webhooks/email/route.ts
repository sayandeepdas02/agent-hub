import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestOrder } from "@/lib/agents/order-intake/ingest";

// Resend inbound parse — fallback for workspaces without Gmail/Outlook OAuth
export async function POST(req: NextRequest) {
  const payload = await req.json();

  const text = payload.text ?? payload.html ?? "";
  const subject = payload.subject ?? "";
  const from = payload.from ?? "";

  // Map email to workspace via connected Gmail/Outlook integration,
  // or fall back to first workspace (dev/testing)
  const toEmail: string = payload.to ?? "";
  let workspaceId: string | undefined;

  if (toEmail) {
    const integration = await prisma.integration.findFirst({
      where: {
        type: { in: ["GMAIL", "OUTLOOK"] },
        status: "CONNECTED",
      },
    });
    if (integration) {
      const creds = integration.credentials as { email?: string };
      if (creds.email === toEmail) workspaceId = integration.workspaceId;
    }
  }

  if (!workspaceId) {
    const ws = await prisma.workspace.findFirst();
    if (!ws) return NextResponse.json({ error: "No workspace" }, { status: 400 });
    workspaceId = ws.id;
  }

  // Parse attachments from Resend format
  const rawAttachments: Array<{ filename?: string; content?: string; contentType?: string }> =
    payload.attachments ?? [];
  const attachments = rawAttachments
    .filter((a) => a.filename && a.contentType)
    .map((a) => ({
      name: a.filename!,
      content: a.content,
      mimeType: a.contentType!,
    }));

  await ingestOrder({
    id: crypto.randomUUID(),
    workspaceId,
    source: "email",
    text: `Subject: ${subject}\nFrom: ${from}\n\n${text}`,
    attachments,
    metadata: { from, subject },
  });

  return NextResponse.json({ ok: true });
}
