import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/apikeys";

export async function GET() {
  const workspace = await prisma.workspace.findFirst();
  if (!workspace) return NextResponse.json([]);

  const keys = await prisma.apiKey.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, lastUsedAt: true, createdAt: true },
  });
  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { label: string };

  if (!body.label?.trim()) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }

  const workspace = await prisma.workspace.findFirst();
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { key, hash } = generateApiKey();

  await prisma.apiKey.create({
    data: {
      workspaceId: workspace.id,
      label: body.label.trim(),
      keyHash: hash,
    },
  });

  // Return the raw key once — it is never stored and cannot be retrieved again
  return NextResponse.json({ key }, { status: 201 });
}
