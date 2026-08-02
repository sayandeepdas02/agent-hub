import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

interface ImportRow { sku: string; name: string; }

export async function POST(req: NextRequest) {
  const { workspaceId } = await requireAuth();
  const body = await req.json() as { items: ImportRow[] };

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "items array is required" }, { status: 400 });
  }

  let created = 0;
  let skipped = 0;

  for (const row of body.items) {
    const sku = row.sku?.trim().toUpperCase();
    const name = row.name?.trim();
    if (!sku || !name) { skipped++; continue; }

    const existing = await prisma.product.findFirst({ where: { workspaceId, sku } });
    if (existing) { skipped++; continue; }

    await prisma.product.create({ data: { workspaceId, sku, name } });
    created++;
  }

  return NextResponse.json({ created, skipped });
}
