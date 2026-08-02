import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  const { workspaceId } = await requireAuth();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 100);

  const products = await prisma.product.findMany({
    where: {
      workspaceId,
      ...(q
        ? {
            OR: [
              { sku: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ sku: "asc" }],
    take: limit,
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const { workspaceId } = await requireAuth();
  const body = await req.json() as { sku: string; name: string };

  if (!body.sku?.trim() || !body.name?.trim()) {
    return NextResponse.json({ error: "sku and name are required" }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      workspaceId,
      sku: body.sku.trim().toUpperCase(),
      name: body.name.trim(),
    },
  });

  return NextResponse.json(product, { status: 201 });
}
