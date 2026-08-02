import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { workspaceId } = await requireAuth();

  const existing = await prisma.customer.findFirst({ where: { id, workspaceId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as { name?: string; email?: string; phone?: string };
  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.email !== undefined ? { email: body.email.trim() || null } : {}),
      ...(body.phone !== undefined ? { phone: body.phone.trim() || null } : {}),
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

  const existing = await prisma.customer.findFirst({ where: { id, workspaceId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
