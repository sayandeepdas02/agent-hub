import { prisma } from "./prisma";
import { enqueueJob } from "./jobs";
import { audit } from "./audit";

export async function dispatchIntegrations(
  orderId: string,
  workspaceId: string,
  agentId: string
) {
  const integrations = await prisma.integration.findMany({
    where: { workspaceId, status: "CONNECTED" },
  });
  if (integrations.length === 0) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { parsedData: true, customer: true },
  });
  if (!order) return;

  const parsed = order.parsedData?.data as Record<string, { value: unknown }> | null;
  const orderPayload = {
    orderId,
    status: order.status,
    source: order.source,
    customer: order.customer?.name ?? (parsed?.["customer_name"]?.value ?? null),
    productSku: parsed?.["product_sku"]?.value ?? null,
    quantity: parsed?.["quantity"]?.value ?? null,
    requestedShipDate: parsed?.["requested_ship_date"]?.value ?? null,
    specialInstructions: parsed?.["special_instructions"]?.value ?? null,
  };

  for (const integration of integrations) {
    await enqueueJob({
      workspaceId,
      agentId,
      type: "integration_dispatch",
      payload: { integrationId: integration.id, orderPayload },
    });

    await audit({
      workspaceId,
      agentId,
      action: "integration.dispatched",
      details: { orderId, integrationType: integration.type, integrationId: integration.id },
    });
  }
}
