import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/lib/apikeys";
import { ingestOrder } from "@/lib/agents/order-intake/ingest";

export async function POST(req: NextRequest) {
  const rawKey = req.headers.get("X-Api-Key");
  if (!rawKey) {
    return NextResponse.json({ error: "X-Api-Key header required" }, { status: 401 });
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(rawKey) },
  });
  if (!apiKey) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Update last-used timestamp without blocking the response
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  const body = await req.json() as {
    text?: string;
    customerName?: string;
    productSku?: string;
    quantity?: number;
    requestedShipDate?: string;
    specialInstructions?: string;
  };

  // Accept either free-form text or structured fields
  const text =
    body.text?.trim() ||
    [
      body.customerName && `Customer: ${body.customerName}`,
      body.productSku && `Product SKU: ${body.productSku}`,
      body.quantity && `Quantity: ${body.quantity}`,
      body.requestedShipDate && `Ship by: ${body.requestedShipDate}`,
      body.specialInstructions && `Notes: ${body.specialInstructions}`,
    ]
      .filter(Boolean)
      .join("\n");

  if (!text) {
    return NextResponse.json(
      { error: "Provide either text or structured fields (customerName, productSku, quantity, ...)" },
      { status: 400 }
    );
  }

  const order = await ingestOrder({
    id: "",
    workspaceId: apiKey.workspaceId,
    source: "api",
    text,
    attachments: [],
    metadata: {},
  });

  return NextResponse.json({ orderId: order.id, status: order.status });
}
