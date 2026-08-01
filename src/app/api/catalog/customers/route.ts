import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const workspace = await prisma.workspace.findFirst();
  if (!workspace) return NextResponse.json([]);

  const customers = await prisma.customer.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { name: string; email?: string; phone?: string };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const workspace = await prisma.workspace.findFirst();
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const customer = await prisma.customer.create({
    data: {
      workspaceId: workspace.id,
      name: body.name.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}
