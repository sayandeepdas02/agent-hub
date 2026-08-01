import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const workspace = await prisma.workspace.findFirst();
  if (!workspace) return NextResponse.json([]);

  const products = await prisma.product.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ sku: "asc" }],
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { sku: string; name: string };

  if (!body.sku?.trim() || !body.name?.trim()) {
    return NextResponse.json({ error: "sku and name are required" }, { status: 400 });
  }

  const workspace = await prisma.workspace.findFirst();
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const product = await prisma.product.create({
    data: {
      workspaceId: workspace.id,
      sku: body.sku.trim().toUpperCase(),
      name: body.name.trim(),
    },
  });

  return NextResponse.json(product, { status: 201 });
}
