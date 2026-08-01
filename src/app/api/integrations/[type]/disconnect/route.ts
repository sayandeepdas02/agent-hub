import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { IntegrationType } from "@prisma/client";

const VALID_TYPES = new Set<string>(["MONDAY", "PRINTAVO", "SHOPWORKS", "QUICKBOOKS", "CUSTOM_REST"]);

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const integrationType = type.toUpperCase();

  if (!VALID_TYPES.has(integrationType)) {
    return NextResponse.json({ error: "Invalid integration type" }, { status: 400 });
  }

  const workspace = await prisma.workspace.findFirst();
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const existing = await prisma.integration.findFirst({
    where: { workspaceId: workspace.id, type: integrationType as IntegrationType },
  });

  if (existing) {
    await prisma.integration.update({
      where: { id: existing.id },
      data: { status: "DISCONNECTED", credentials: {} },
    });
  }

  return NextResponse.json({ ok: true });
}
