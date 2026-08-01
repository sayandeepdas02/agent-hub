import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "../redis";
import { prisma } from "../prisma";

export interface AutomationJobData {
  prismaJobId: string;
  workspaceId: string;
  ruleId: string;
  ruleName: string;
  url: string;
  context: Record<string, unknown>;
}

export function createAutomationWorker() {
  return new Worker<AutomationJobData>(
    "automation",
    async (job: Job<AutomationJobData>) => {
      const { prismaJobId, url, context } = job.data;

      await prisma.job.update({
        where: { id: prismaJobId },
        data: { status: "RUNNING", attempts: { increment: 1 } },
      });

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });
      if (!res.ok) throw new Error(`Automation HTTP POST failed: HTTP ${res.status} → ${url}`);

      await prisma.job.update({
        where: { id: prismaJobId },
        data: { status: "COMPLETED" },
      });
    },
    {
      connection: getRedisConnection(),
      concurrency: 10,
    }
  );
}
