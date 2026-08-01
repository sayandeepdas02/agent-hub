import { prisma } from "./prisma";

export type JobType = "integration_dispatch" | "automation_http_post";

export async function enqueueJob(data: {
  workspaceId: string;
  agentId?: string;
  type: JobType;
  payload: object;
}) {
  const job = await prisma.job.create({
    data: { ...data, status: "PENDING" },
  });
  // Process in background without blocking the caller
  processJobs().catch(() => {});
  return job;
}

export async function processJobs(): Promise<{ processed: number; failed: number }> {
  const jobs = await prisma.job.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    // Atomic claim — skip if another concurrent call already took it
    const claimed = await prisma.job.updateMany({
      where: { id: job.id, status: "PENDING" },
      data: { status: "RUNNING", attempts: { increment: 1 } },
    });
    if (claimed.count === 0) continue;

    try {
      await runJobHandler(job.type, job.payload as Record<string, unknown>, job.workspaceId);
      await prisma.job.update({ where: { id: job.id }, data: { status: "COMPLETED" } });
      processed++;
    } catch (err) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          error: err instanceof Error ? err.message : String(err),
        },
      });
      failed++;
    }
  }

  return { processed, failed };
}

async function runJobHandler(
  type: string,
  payload: Record<string, unknown>,
  workspaceId: string
) {
  switch (type) {
    case "integration_dispatch":
      return handleIntegrationDispatch(payload, workspaceId);
    case "automation_http_post":
      return handleAutomationHttpPost(payload);
    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}

async function handleIntegrationDispatch(
  payload: Record<string, unknown>,
  _workspaceId: string
) {
  const { integrationId, orderPayload } = payload as {
    integrationId: string;
    orderPayload: Record<string, unknown>;
  };

  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });
  if (!integration || integration.status !== "CONNECTED") return;

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
  // Other types: credentials stored, live API call comes in Phase 4
}

async function handleAutomationHttpPost(payload: Record<string, unknown>) {
  const { url, context } = payload as {
    url: string;
    context: Record<string, unknown>;
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(context),
  });
  if (!res.ok) throw new Error(`Automation HTTP POST failed: HTTP ${res.status} → ${url}`);
}
