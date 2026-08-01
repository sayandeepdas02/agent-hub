import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import type { IntegrationType } from "@prisma/client";

const VALID_TYPES = new Set<string>([
  "MONDAY",
  "PRINTAVO",
  "SHOPWORKS",
  "QUICKBOOKS",
  "CUSTOM_REST",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { workspaceId } = await requireAuth();
  const { type } = await params;
  const integrationType = type.toUpperCase();

  if (!VALID_TYPES.has(integrationType)) {
    return NextResponse.json({ error: "Invalid integration type" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({})) as { credentials?: Record<string, string> };
  const credentials = body.credentials ?? {};

  if (integrationType === "CUSTOM_REST" && !credentials.url) {
    return NextResponse.json({ error: "url is required for Custom REST" }, { status: 400 });
  }

  const existing = await prisma.integration.findFirst({
    where: { workspaceId, type: integrationType as IntegrationType },
  });

  if (existing) {
    await prisma.integration.update({
      where: { id: existing.id },
      data: { status: "CONNECTED", credentials },
    });
  } else {
    await prisma.integration.create({
      data: { workspaceId, type: integrationType as IntegrationType, status: "CONNECTED", credentials },
    });
  }

  return NextResponse.json({ ok: true });
}
