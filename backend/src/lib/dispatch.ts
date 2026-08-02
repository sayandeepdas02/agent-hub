import { prisma } from "./prisma";
import { enqueueJob } from "./jobs";
import { audit } from "./audit";
import type { ExtractedLineItem } from "./agents/contract";

export async function dispatchIntegrations(
  orderId: string,
  workspaceId: string,
  agentId: string
) {
  const [integrations, webhooks] = await Promise.all([
    prisma.integration.findMany({ where: { workspaceId, status: "CONNECTED" } }),
    prisma.webhook.findMany({
      where: { workspaceId, eventTypes: { has: "order.completed" } },
    }),
  ]);
  if (integrations.length === 0 && webhooks.length === 0) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { parsedData: true, customer: true },
  });
  if (!order) return;

  const parsed = order.parsedData?.data as Record<string, { value: unknown }> | null;
  const lineItemsRaw = (order.parsedData?.lineItems ?? []) as unknown as ExtractedLineItem[];

  const lineItems = lineItemsRaw.map((item) => ({
    productSku: item.product_sku?.value ?? null,
    productName: item.product_name?.value ?? null,
    quantity: item.quantity?.value ?? null,
    unitPrice: item.unit_price?.value ?? null,
    color: item.color?.value ?? null,
    size: item.size?.value ?? null,
    uom: item.uom?.value ?? null,
  }));

  const orderPayload = {
    orderId,
    status: order.status,
    source: order.source,
    customer: order.customer?.name ?? (parsed?.["customer_name"]?.value ?? null),
    requestedShipDate: parsed?.["requested_ship_date"]?.value ?? null,
    specialInstructions: parsed?.["special_instructions"]?.value ?? null,
    lineItems,
    // Legacy single-product fields for backwards compatibility
    productSku: lineItems[0]?.productSku ?? null,
    quantity: lineItems[0]?.quantity ?? null,
  };

  for (const integration of integrations) {
    await enqueueJob({
      workspaceId,
      agentId,
      type: "integration_dispatch",
      queueName: "integration",
      payload: { integrationId: integration.id, orderPayload },
    });

    await audit({
      workspaceId,
      agentId,
      action: "integration.dispatched",
      details: { orderId, integrationType: integration.type, integrationId: integration.id },
    });
  }

  for (const webhook of webhooks) {
    await enqueueJob({
      workspaceId,
      agentId,
      type: "webhook_delivery",
      queueName: "integration",
      payload: { webhookId: webhook.id, eventType: "order.completed", orderPayload },
    });
  }
}
