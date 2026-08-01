import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

export async function GET() {
  const { workspaceId } = await requireAuth();
  const products = await prisma.product.findMany({
    where: { workspaceId },
    orderBy: [{ sku: "asc" }],
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
