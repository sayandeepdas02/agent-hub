import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  const { workspaceId } = await requireAuth();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 100);

  const customers = await prisma.customer.findMany({
    where: {
      workspaceId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: limit,
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
