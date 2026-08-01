import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "../redis";
import { prisma } from "../prisma";

export interface IntegrationJobData {
  prismaJobId: string;
  integrationId: string;
  orderPayload: Record<string, unknown>;
  workspaceId: string;
}

export function createIntegrationWorker() {
  return new Worker<IntegrationJobData>(
    "integration",
    async (job: Job<IntegrationJobData>) => {
      const { prismaJobId, integrationId, orderPayload } = job.data;

      await prisma.job.update({
        where: { id: prismaJobId },
        data: { status: "RUNNING", attempts: { increment: 1 } },
      });

      const integration = await prisma.integration.findUnique({
        where: { id: integrationId },
      });
      if (!integration || integration.status !== "CONNECTED") {
        await prisma.job.update({
          where: { id: prismaJobId },
          data: { status: "COMPLETED" },
        });
        return;
      }

      if (integration.type === "CUSTOM_REST") {
        const creds = integration.credentials as { url?: string; secret?: string };
        if (!creds.url) throw new Error("Custom REST integration has no URL configured");

        const body = JSON.stringify(orderPayload);
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (creds.secret) {
          const { createHmac } = await import("crypto");
          headers["X-Hub-Signature-256"] =
            "sha256=" + createHmac("sha256", creds.secret).update(body).digest("hex");
        }

        const res = await fetch(creds.url, { method: "POST", headers, body });
        if (!res.ok) throw new Error(`Integration POST failed: HTTP ${res.status}`);
      }

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
