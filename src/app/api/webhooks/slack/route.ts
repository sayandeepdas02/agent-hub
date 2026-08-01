import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ingestOrder } from "@/lib/agents/order-intake/ingest";

function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string
): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return false;
  const base = `v0:${timestamp}:${body}`;
  const expected = `v0=${crypto
    .createHmac("sha256", secret)
    .update(base)
    .digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const signature = req.headers.get("x-slack-signature") ?? "";

  if (process.env.NODE_ENV === "production") {
    const stale = Math.abs(Date.now() / 1000 - Number(timestamp)) > 300;
    if (stale || !verifySlackSignature(body, timestamp, signature)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const payload = JSON.parse(body);

  // Handle Slack URL verification challenge
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  const event = payload.event;
  if (!event || event.type !== "message" || event.bot_id) {
    return NextResponse.json({ ok: true });
  }

  // Resolve workspace from Slack team ID — use first workspace as fallback for dev
  const workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }

  await ingestOrder({
    id: event.client_msg_id ?? event.ts,
    workspaceId: workspace.id,
    source: "slack",
    text: event.text ?? "",
    attachments: [],
    metadata: { channel: event.channel, user: event.user, ts: event.ts },
  });

  return NextResponse.json({ ok: true });
}
