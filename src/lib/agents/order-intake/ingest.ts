import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { extractAttachmentText } from "@/lib/pdf";
import { runAutomationRules } from "@/lib/automation";
import { notifySlackReviewNeeded } from "@/lib/notify";
import type { NormalizedRecord } from "../contract";
import { orderIntakeAgent } from "./index";
import { execute } from "./execute";
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
  const order = await prisma.order.create({
    data: {
      workspaceId: record.workspaceId,
      status: "PENDING",
      source: record.source.toUpperCase() as OrderSource,
      rawMessages: {
        create: {
          text: record.text,
          attachments: record.attachments as object[],
          source: record.source,
        },
      },
    },
  });

  // Duplicate check — same exact text received in the last 48h
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

  try {
    // Enrich plain text with any extractable PDF attachment content
    const attachmentText = await extractAttachmentText(record.attachments);
    const enrichedRecord: NormalizedRecord = attachmentText
      ? { ...record, text: `${record.text}\n\n${attachmentText}` }
      : record;

    const extracted = await orderIntakeAgent.extract(enrichedRecord);
    const validation = await orderIntakeAgent.validate(
      extracted,
      record.workspaceId
    );

    const fieldConfidence = Object.fromEntries(
      Object.entries(extracted.fields).map(([k, v]) => [k, v.confidence])
    );

    await prisma.parsedData.create({
      data: {
        orderId: order.id,
        data: extracted.fields as object,
        orderConfidence: extracted.orderConfidence,
        fieldConfidence,
        needsReview: validation.outcome === "review",
      },
    });

    if (validation.outcome === "auto") {
      await execute(order.id, record.workspaceId, {
        resolvedCustomerId: validation.resolvedCustomerId,
      });
      await audit({
        workspaceId: record.workspaceId,
        agentId: orderIntakeAgent.id,
        action: "order.auto_created",
        details: {
          orderId: order.id,
          ...(validation.resolvedCustomerId ? { customerId: validation.resolvedCustomerId } : {}),
          ...(validation.resolvedProductId ? { productId: validation.resolvedProductId } : {}),
        },
      });
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "REVIEW_NEEDED" },
      });
      await audit({
        workspaceId: record.workspaceId,
        agentId: orderIntakeAgent.id,
        action: "order.needs_review",
        details: { orderId: order.id, reasons: validation.reasons },
      });
      await runAutomationRules("order.needs_review", record.workspaceId, {
        orderId: order.id,
        reasons: validation.reasons,
      });
      await notifySlackReviewNeeded(order.id, record.workspaceId, validation.reasons);
    }
  } catch (err) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED" },
    });
    await audit({
      workspaceId: record.workspaceId,
      agentId: orderIntakeAgent.id,
      action: "order.extraction_failed",
      details: {
        orderId: order.id,
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }

  // Re-fetch to return the final status, not the initial PENDING
  return prisma.order.findUniqueOrThrow({ where: { id: order.id } });
}
