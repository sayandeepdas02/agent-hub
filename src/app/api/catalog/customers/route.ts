import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

export async function GET() {
  const { workspaceId } = await requireAuth();
  const customers = await prisma.customer.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const { workspaceId } = await requireAuth();
  const body = await req.json() as { name: string; email?: string; phone?: string };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: {
      workspaceId,
      name: body.name.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}
