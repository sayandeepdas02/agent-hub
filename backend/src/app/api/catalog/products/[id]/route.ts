import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { workspaceId } = await requireAuth();

  const existing = await prisma.product.findFirst({ where: { id, workspaceId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as { sku?: string; name?: string };
  if (body.sku !== undefined && !body.sku.trim()) {
    return NextResponse.json({ error: "sku cannot be empty" }, { status: 400 });
  }
  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(body.sku !== undefined ? { sku: body.sku.trim().toUpperCase() } : {}),
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { workspaceId } = await requireAuth();

  const existing = await prisma.product.findFirst({ where: { id, workspaceId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
