import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "../redis";
import { prisma } from "../prisma";
import { audit } from "../audit";
import { orderIntakeAgent } from "../agents/order-intake/index";
import { execute } from "../agents/order-intake/execute";
import { runAutomationRules } from "../automation";
import { notifySlackReviewNeeded } from "../notify";
import { extractAttachmentText } from "../attachments";
import type { NormalizedRecord } from "../agents/contract";

export interface ExtractionJobData {
  prismaJobId: string;
  orderId: string;
  workspaceId: string;
  record: NormalizedRecord;
}

export function createExtractionWorker() {
  return new Worker<ExtractionJobData>(
    "extraction",
    async (job: Job<ExtractionJobData>) => {
      const { prismaJobId, orderId, workspaceId, record } = job.data;

      await prisma.job.update({
        where: { id: prismaJobId },
        data: { status: "RUNNING", attempts: { increment: 1 } },
      });

      const attachmentText = await extractAttachmentText(record.attachments);
      const enriched: NormalizedRecord = attachmentText
        ? { ...record, text: `${record.text}\n\n${attachmentText}` }
        : record;

      const extracted = await orderIntakeAgent.extract(enriched);
      const validation = await orderIntakeAgent.validate(extracted, workspaceId);

      const fieldConfidence = Object.fromEntries(
        Object.entries(extracted.fields).map(([k, v]) => [k, v.confidence])
      );

      await prisma.parsedData.create({
        data: {
          orderId,
          data: extracted.fields as object,
          orderConfidence: extracted.orderConfidence,
          fieldConfidence,
          needsReview: validation.outcome === "review",
        },
      });

      if (validation.outcome === "auto") {
        await execute(orderId, workspaceId, {
          resolvedCustomerId: validation.resolvedCustomerId,
        });
        await audit({
          workspaceId,
          agentId: orderIntakeAgent.id,
          action: "order.auto_created",
          details: {
            orderId,
            ...(validation.resolvedCustomerId ? { customerId: validation.resolvedCustomerId } : {}),
            ...(validation.resolvedProductId ? { productId: validation.resolvedProductId } : {}),
          },
        });
      } else {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: "REVIEW_NEEDED" },
        });
        await audit({
          workspaceId,
          agentId: orderIntakeAgent.id,
          action: "order.needs_review",
          details: { orderId, reasons: validation.reasons },
        });
        await runAutomationRules("order.needs_review", workspaceId, {
          orderId,
          reasons: validation.reasons,
        });
        await notifySlackReviewNeeded(orderId, workspaceId, validation.reasons);
      }

      await prisma.job.update({
        where: { id: prismaJobId },
        data: { status: "COMPLETED" },
      });
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );
}
