import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

interface ImportRow { name: string; email?: string; phone?: string; }

export async function POST(req: NextRequest) {
  const { workspaceId } = await requireAuth();
  const body = await req.json() as { items: ImportRow[] };

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "items array is required" }, { status: 400 });
  }

  let created = 0;
  let skipped = 0;

  for (const row of body.items) {
    const name = row.name?.trim();
    if (!name) { skipped++; continue; }

    const existing = await prisma.customer.findFirst({
      where: { workspaceId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) { skipped++; continue; }

    await prisma.customer.create({
      data: {
        workspaceId,
        name,
        email: row.email?.trim() || null,
        phone: row.phone?.trim() || null,
      },
    });
    created++;
  }

  return NextResponse.json({ created, skipped });
}
