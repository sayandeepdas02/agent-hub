import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const workspace = await prisma.workspace.findFirst();
  if (!workspace) return NextResponse.json([]);

  const rules = await prisma.automationRule.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    name: string;
    trigger: string;
    url: string;
  };

  if (!body.name?.trim() || !body.trigger?.trim() || !body.url?.trim()) {
    return NextResponse.json({ error: "name, trigger, and url are required" }, { status: 400 });
  }

  const workspace = await prisma.workspace.findFirst();
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const rule = await prisma.automationRule.create({
    data: {
      workspaceId: workspace.id,
      name: body.name.trim(),
      trigger: body.trigger.trim(),
      steps: [{ type: "http_post", url: body.url.trim() }],
      enabled: true,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
