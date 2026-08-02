import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { generateApiKey } from "@/lib/apikeys";

export async function GET() {
  const { workspaceId } = await requireAuth();
  const keys = await prisma.apiKey.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, lastUsedAt: true, createdAt: true },
  });
  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const { workspaceId } = await requireAuth();
  const body = await req.json() as { label: string };

  if (!body.label?.trim()) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }

  const { key, hash } = generateApiKey();
  await prisma.apiKey.create({
    data: { workspaceId, label: body.label.trim(), keyHash: hash },
  });

  // Raw key returned once — never stored, cannot be retrieved again
  return NextResponse.json({ key }, { status: 201 });
}
