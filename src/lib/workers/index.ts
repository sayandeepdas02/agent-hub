import { createExtractionWorker } from "./extraction";
import { createIntegrationWorker } from "./integration";
import { createAutomationWorker } from "./automation";
import { createNotificationWorker } from "./notification";
import { createEmailSyncWorker } from "./email-sync";
import { prisma } from "../prisma";

let started = false;

export function startWorkers() {
  if (started) return;
  started = true;

  const workers = [
    createExtractionWorker(),
    createIntegrationWorker(),
    createAutomationWorker(),
    createNotificationWorker(),
    createEmailSyncWorker(),
  ];

  for (const worker of workers) {
    worker.on("failed", async (job, err) => {
      if (!job) return;
      const data = job.data as { prismaJobId?: string };
      if (data.prismaJobId) {
        await prisma.job
          .update({
            where: { id: data.prismaJobId },
            data: {
              status: job.attemptsMade >= (job.opts.attempts ?? 3) ? "FAILED" : "PENDING",
              error: err.message,
            },
          })
          .catch(() => {});
      }
    });
  }

  console.log("[workers] Started: extraction, integration, automation, notification, email-sync");
}
