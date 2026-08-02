import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

const VALID_EVENTS = ["order.completed", "order.review_needed", "order.failed"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { workspaceId } = await requireAuth();
  const { id } = await params;
  const body = await req.json() as { url?: string; eventTypes?: string[] };

  const webhook = await prisma.webhook.findFirst({ where: { id, workspaceId } });
  if (!webhook) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: { url?: string; eventTypes?: string[] } = {};
  if (body.url !== undefined) {
    try { new URL(body.url); } catch {
      return NextResponse.json({ error: "url must be a valid URL" }, { status: 400 });
    }
    data.url = body.url.trim();
  }
  if (body.eventTypes !== undefined) {
    data.eventTypes = body.eventTypes.filter((e) =>
      (VALID_EVENTS as readonly string[]).includes(e)
    );
  }

  const updated = await prisma.webhook.update({ where: { id }, data });
  return NextResponse.json({ webhook: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { workspaceId } = await requireAuth();
  const { id } = await params;

  const webhook = await prisma.webhook.findFirst({ where: { id, workspaceId } });
  if (!webhook) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.webhook.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
