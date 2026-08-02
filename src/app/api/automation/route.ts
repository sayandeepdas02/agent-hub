import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

export async function GET() {
  const { workspaceId } = await requireAuth();
  const rules = await prisma.automationRule.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const { workspaceId } = await requireAuth();
  const body = await req.json() as { name: string; trigger: string; url: string };

  if (!body.name?.trim() || !body.trigger?.trim() || !body.url?.trim()) {
    return NextResponse.json(
      { error: "name, trigger, and url are required" },
      { status: 400 }
    );
  }

  const rule = await prisma.automationRule.create({
    data: {
      workspaceId,
      name: body.name.trim(),
      trigger: body.trigger.trim(),
      steps: [{ type: "http_post", url: body.url.trim() }],
      enabled: true,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
