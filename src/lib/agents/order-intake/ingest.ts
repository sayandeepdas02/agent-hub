import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { runAutomationRules } from "@/lib/automation";
import { enqueueJob } from "@/lib/jobs";
import type { NormalizedRecord } from "../contract";
import { orderIntakeAgent } from "./index";
import type { OrderSource } from "@prisma/client";

async function findDuplicate(workspaceId: string, text: string, excludeOrderId: string) {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<Array<{ orderId: string }>>`
    SELECT rm."orderId"
    FROM agent_order_intake."RawMessage" rm
    JOIN agent_order_intake."Order" o ON o.id = rm."orderId"
    WHERE rm.text = ${text}
      AND o."workspaceId" = ${workspaceId}
      AND rm."createdAt" > ${cutoff}
      AND rm."orderId" != ${excludeOrderId}
    LIMIT 1
  `;
  return rows[0]?.orderId ?? null;
}

export async function ingestOrder(record: NormalizedRecord) {
  const emailThreadId = record.metadata?.emailThreadId as string | undefined;
  const messageId = record.metadata?.messageId as string | undefined;
  const inReplyTo = record.metadata?.inReplyTo as string | undefined;

  // Thread detection — if we have a threadId and an order already has it, append instead
  if (emailThreadId) {
    const threadOrder = await prisma.order.findFirst({
      where: { workspaceId: record.workspaceId, emailThreadId },
    });
    if (threadOrder) {
      await prisma.rawMessage.create({
        data: {
          orderId: threadOrder.id,
          text: record.text,
          attachments: record.attachments as object[],
          source: record.source,
          messageId,
          inReplyTo,
        },
      });
      return threadOrder;
    }
  }

  const order = await prisma.order.create({
    data: {
      workspaceId: record.workspaceId,
      status: "PENDING",
      source: record.source.toUpperCase() as OrderSource,
      emailThreadId,
      rawMessages: {
        create: {
          text: record.text,
          attachments: record.attachments as object[],
          source: record.source,
          messageId,
          inReplyTo,
        },
      },
    },
  });

  const duplicateOfId = await findDuplicate(record.workspaceId, record.text, order.id);
  if (duplicateOfId) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED", duplicateOfId },
    });
    await audit({
      workspaceId: record.workspaceId,
      agentId: orderIntakeAgent.id,
      action: "order.duplicate_detected",
      details: { orderId: order.id, duplicateOfId },
    });
    return order;
  }

  await audit({
    workspaceId: record.workspaceId,
    agentId: orderIntakeAgent.id,
    action: "order.received",
    details: { orderId: order.id, source: record.source },
  });

  await runAutomationRules("order.received", record.workspaceId, {
    orderId: order.id,
    source: record.source,
  });

  if (!orderIntakeAgent.needsExtraction(record)) {
    return order;
  }

  // Enqueue extraction async — worker handles extract/validate/execute
  await enqueueJob({
    workspaceId: record.workspaceId,
    agentId: orderIntakeAgent.id,
    type: "order_extraction",
    queueName: "extraction",
    payload: {
      orderId: order.id,
      workspaceId: record.workspaceId,
      record,
    },
  });

  return order;
}
