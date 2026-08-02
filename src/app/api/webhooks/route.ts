import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { randomBytes } from "crypto";

const VALID_EVENTS = ["order.completed", "order.review_needed", "order.failed"] as const;

export async function GET() {
  const { workspaceId } = await requireAuth();
  const webhooks = await prisma.webhook.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { deliveries: true } } },
  });
  return NextResponse.json({ webhooks });
}

export async function POST(req: NextRequest) {
  const { workspaceId } = await requireAuth();
  const body = await req.json() as { url?: string; eventTypes?: string[] };

  if (!body.url?.trim()) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  try {
    new URL(body.url);
  } catch {
    return NextResponse.json({ error: "url must be a valid URL" }, { status: 400 });
  }

  const eventTypes = (body.eventTypes ?? ["order.completed"]).filter((e) =>
    (VALID_EVENTS as readonly string[]).includes(e)
  );
  if (eventTypes.length === 0) {
    return NextResponse.json({ error: "at least one valid eventType is required" }, { status: 400 });
  }

  const secret = randomBytes(24).toString("hex");
  const webhook = await prisma.webhook.create({
    data: { workspaceId, url: body.url.trim(), eventTypes, secret },
  });

  return NextResponse.json({ webhook: { ...webhook, secret } }, { status: 201 });
}
