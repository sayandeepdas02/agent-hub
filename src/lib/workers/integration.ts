import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "../redis";
import { prisma } from "../prisma";
import { createHmac, randomUUID } from "crypto";

interface IntegrationJobData {
  prismaJobId: string;
  integrationId: string;
  orderPayload: Record<string, unknown>;
  workspaceId: string;
}

interface WebhookDeliveryJobData {
  prismaJobId: string;
  webhookId: string;
  eventType: string;
  orderPayload: Record<string, unknown>;
  workspaceId: string;
}

type WorkerJobData = IntegrationJobData | WebhookDeliveryJobData;

function isWebhookJob(data: WorkerJobData): data is WebhookDeliveryJobData {
  return "webhookId" in data;
}

function hmacSha256(secret: string, body: string) {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

async function deliverWebhook(
  url: string,
  secret: string,
  eventType: string,
  payload: Record<string, unknown>,
  attempt: number
): Promise<{ statusCode: number | null; responseBody: string | null; error: string | null }> {
  const envelope = { id: randomUUID(), event: eventType, timestamp: new Date().toISOString(), data: payload };
  const body = JSON.stringify(envelope);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Hub-Event": eventType,
    "X-Hub-Delivery": envelope.id,
    "X-Hub-Signature-256": hmacSha256(secret, body),
  };

  try {
    const res = await fetch(url, { method: "POST", headers, body });
    const responseBody = await res.text().catch(() => null);
    if (!res.ok) {
      return { statusCode: res.status, responseBody, error: `HTTP ${res.status}` };
    }
    return { statusCode: res.status, responseBody, error: null };
  } catch (err) {
    return { statusCode: null, responseBody: null, error: String(err) };
  }
}

export function createIntegrationWorker() {
  return new Worker<WorkerJobData>(
    "integration",
    async (job: Job<WorkerJobData>) => {
      const { prismaJobId } = job.data;

      await prisma.job.update({
        where: { id: prismaJobId },
        data: { status: "RUNNING", attempts: { increment: 1 } },
      });

      if (isWebhookJob(job.data)) {
        await handleWebhookDelivery(job.data, job.attemptsMade + 1);
      } else {
        await handleIntegrationDispatch(job.data);
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

async function handleWebhookDelivery(data: WebhookDeliveryJobData, attempt: number) {
  const webhook = await prisma.webhook.findUnique({ where: { id: data.webhookId } });
  if (!webhook) return;

  const result = await deliverWebhook(
    webhook.url,
    webhook.secret,
    data.eventType,
    data.orderPayload,
    attempt
  );

  await prisma.webhookDelivery.create({
    data: {
      webhookId: webhook.id,
      eventType: data.eventType,
      payload: data.orderPayload as object,
      statusCode: result.statusCode,
      responseBody: result.responseBody,
      error: result.error,
      attempt,
    },
  });

  if (result.error) {
    throw new Error(result.error);
  }
}

async function handleIntegrationDispatch(data: IntegrationJobData) {
  const integration = await prisma.integration.findUnique({
    where: { id: data.integrationId },
  });
  if (!integration || integration.status !== "CONNECTED") return;

  const creds = integration.credentials as Record<string, string | undefined>;

  switch (integration.type) {
    case "CUSTOM_REST": {
      if (!creds.url) throw new Error("Custom REST integration has no URL configured");
      const body = JSON.stringify(data.orderPayload);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (creds.secret) {
        headers["X-Hub-Signature-256"] = hmacSha256(creds.secret, body);
      }
      const res = await fetch(creds.url, { method: "POST", headers, body });
      if (!res.ok) throw new Error(`Custom REST POST failed: HTTP ${res.status}`);
      break;
    }

    case "MONDAY": {
      // Requires MONDAY_API_KEY and MONDAY_BOARD_ID in credentials
      if (!creds.apiKey || !creds.boardId) {
        throw new Error("Monday.com integration requires apiKey and boardId");
      }
      const payload = data.orderPayload as Record<string, unknown>;
      const columnValues = JSON.stringify({
        text: String(payload.customer ?? ""),
        numbers: String(payload.quantity ?? ""),
        date: payload.requestedShipDate ? { date: String(payload.requestedShipDate) } : undefined,
      });
      const mutation = `mutation { create_item (board_id: ${creds.boardId}, item_name: "Order ${payload.orderId}", column_values: ${JSON.stringify(columnValues)}) { id } }`;
      const res = await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: creds.apiKey },
        body: JSON.stringify({ query: mutation }),
      });
      if (!res.ok) throw new Error(`Monday.com API failed: HTTP ${res.status}`);
      break;
    }

    case "PRINTAVO": {
      // Requires PRINTAVO_EMAIL, PRINTAVO_TOKEN, PRINTAVO_SHOP_URL in credentials
      if (!creds.shopUrl || !creds.email || !creds.token) {
        throw new Error("Printavo integration requires shopUrl, email, and token");
      }
      const res = await fetch(`${creds.shopUrl}/api/v1/quotes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          email: creds.email,
          token: creds.token,
        },
        body: JSON.stringify({ customer_id: null, orderPayload: data.orderPayload }),
      });
      if (!res.ok) throw new Error(`Printavo API failed: HTTP ${res.status}`);
      break;
    }

    case "SHOPWORKS": {
      if (!creds.url || !creds.apiKey) {
        throw new Error("ShopWorks integration requires url and apiKey");
      }
      const res = await fetch(`${creds.url}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": creds.apiKey },
        body: JSON.stringify(data.orderPayload),
      });
      if (!res.ok) throw new Error(`ShopWorks API failed: HTTP ${res.status}`);
      break;
    }

    case "QUICKBOOKS": {
      // OAuth2 — access token should be in credentials
      if (!creds.accessToken || !creds.realmId) {
        throw new Error("QuickBooks integration requires accessToken and realmId");
      }
      const payload = data.orderPayload as Record<string, unknown>;
      const res = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${creds.realmId}/salesorder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${creds.accessToken}`,
            Accept: "application/json",
          },
          body: JSON.stringify({
            CustomerRef: { name: String(payload.customer ?? "") },
            Line: (payload.lineItems as unknown[]) ?? [],
          }),
        }
      );
      if (!res.ok) throw new Error(`QuickBooks API failed: HTTP ${res.status}`);
      break;
    }

    case "GMAIL":
    case "OUTLOOK":
      // Email integrations are inbound only — no outbound dispatch
      break;

    default:
      break;
  }
}
