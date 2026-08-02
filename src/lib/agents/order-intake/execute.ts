import { prisma } from "@/lib/prisma";
import { findCustomerFuzzy } from "./validate";
import { dispatchIntegrations } from "@/lib/dispatch";
import { runAutomationRules } from "@/lib/automation";
import type { ExecutionResult } from "../contract";

export interface OrderOverrides {
  customerName?: string;
  productSku?: string;
  quantity?: number;
  requestedShipDate?: string;
  specialInstructions?: string;
  resolvedCustomerId?: string;
  resolvedProductIds?: string[];
  lineItems?: Array<{
    productSku?: string;
    productName?: string;
    quantity?: number;
    unitPrice?: number;
    color?: string;
    size?: string;
    uom?: string;
  }>;
}

export async function execute(
  orderId: string,
  workspaceId: string,
  overrides?: OrderOverrides
): Promise<ExecutionResult> {
  let customerId: string | undefined = overrides?.resolvedCustomerId;

  // If human provided a customer name override, try to resolve it
  if (!customerId && overrides?.customerName) {
    const customer = await findCustomerFuzzy(workspaceId, overrides.customerName);
    customerId = customer?.id;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "COMPLETED",
      ...(customerId ? { customerId } : {}),
    },
  });

  // Fire integrations + automation rules without blocking the response
  await dispatchIntegrations(orderId, workspaceId, "order-intake");
  await runAutomationRules("order.completed", workspaceId, { orderId, workspaceId });

  return { success: true };
}
