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
          lineItems: extracted.lineItems as unknown as object[],
          issues: validation.issues as unknown as object[],
          orderConfidence: extracted.orderConfidence,
          fieldConfidence,
          needsReview: validation.outcome === "review",
        },
      });

      if (validation.outcome === "auto") {
        await execute(orderId, workspaceId, {
          resolvedCustomerId: validation.resolvedCustomerId,
          resolvedProductIds: validation.resolvedProductIds,
        });
        await audit({
          workspaceId,
          agentId: orderIntakeAgent.id,
          action: "order.auto_created",
          details: {
            orderId,
            ...(validation.resolvedCustomerId ? { customerId: validation.resolvedCustomerId } : {}),
            ...(validation.resolvedProductIds?.length ? { productIds: validation.resolvedProductIds } : {}),
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
          details: { orderId, issues: validation.issues },
        });
        await runAutomationRules("order.needs_review", workspaceId, {
          orderId,
          reasons: validation.issues.map((iss) => iss.message),
        });
        await notifySlackReviewNeeded(
          orderId,
          workspaceId,
          validation.issues.map((iss) => `[${iss.severity.toUpperCase()}] ${iss.message}`)
        );
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
