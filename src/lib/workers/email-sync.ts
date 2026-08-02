import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "../redis";
import { prisma } from "../prisma";
import { ingestOrder } from "../agents/order-intake/ingest";
import { classifyEmail } from "../email-classify";
import { sendOrderAcknowledgement } from "../email-ack";
import { extractAttachmentText } from "../attachments";
import {
  refreshGmailToken,
  getGmailMessage,
  listGmailHistory,
  type ParsedEmail as GmailParsedEmail,
} from "../gmail";
import {
  refreshOutlookToken,
  getOutlookMessage,
  type ParsedEmail as OutlookParsedEmail,
} from "../outlook";

export interface EmailSyncJobData {
  workspaceId: string;
  integrationId: string;
  provider: "gmail" | "outlook";
  historyId?: string; // Gmail: process history since this id
  messageId?: string; // Direct message fetch (Outlook or Gmail fallback)
}

type ParsedEmail = GmailParsedEmail | OutlookParsedEmail;

async function getValidGmailToken(integrationId: string): Promise<{
  accessToken: string;
  credentials: Record<string, unknown>;
}> {
  const integration = await prisma.integration.findUniqueOrThrow({
    where: { id: integrationId },
  });
  const creds = integration.credentials as {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    email: string;
    historyId: string;
  };

  if (Date.now() > creds.expiresAt - 60_000) {
    const refreshed = await refreshGmailToken(creds.refreshToken);
    const updated = { ...creds, accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt };
    await prisma.integration.update({
      where: { id: integrationId },
      data: { credentials: updated },
    });
    return { accessToken: refreshed.accessToken, credentials: updated };
  }
  return { accessToken: creds.accessToken, credentials: creds as Record<string, unknown> };
}

async function getValidOutlookToken(integrationId: string): Promise<{
  accessToken: string;
  credentials: Record<string, unknown>;
}> {
  const integration = await prisma.integration.findUniqueOrThrow({
    where: { id: integrationId },
  });
  const creds = integration.credentials as {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    email: string;
    subscriptionId?: string;
  };

  if (Date.now() > creds.expiresAt - 60_000) {
    const refreshed = await refreshOutlookToken(creds.refreshToken);
    const updated = { ...creds, accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken, expiresAt: refreshed.expiresAt };
    await prisma.integration.update({
      where: { id: integrationId },
      data: { credentials: updated },
    });
    return { accessToken: refreshed.accessToken, credentials: updated };
  }
  return { accessToken: creds.accessToken, credentials: creds as Record<string, unknown> };
}

async function processEmail(
  email: ParsedEmail,
  workspaceId: string
) {
  // Thread detection — check if an order already has this threadId
  const existing = email.threadId
    ? await prisma.order.findFirst({
        where: { workspaceId, emailThreadId: email.threadId },
      })
    : null;

  if (existing) {
    // Append to existing order as a follow-up message
    await prisma.rawMessage.create({
      data: {
        orderId: existing.id,
        text: email.text,
        attachments: email.attachments as object[],
        source: "email",
        messageId: email.messageId,
        inReplyTo: email.inReplyTo,
      },
    });
    return;
  }

  // New thread — classify before ingesting
  const emailClass = await classifyEmail(email.subject, email.text);

  // Only process order-relevant emails
  if (emailClass !== "new_order" && emailClass !== "quote_request") return;

  // Extract text from attachments for richer extraction
  const attachmentText = await extractAttachmentText(
    email.attachments.map((a) => ({
      name: a.name,
      content: a.content,
      mimeType: a.mimeType,
    }))
  );

  const combinedText = attachmentText
    ? `Subject: ${email.subject}\nFrom: ${email.from}\n\n${email.text}\n\n${attachmentText}`
    : `Subject: ${email.subject}\nFrom: ${email.from}\n\n${email.text}`;

  const order = await ingestOrder({
    id: email.messageId,
    workspaceId,
    source: "email",
    text: combinedText,
    attachments: email.attachments.map((a) => ({
      name: a.name,
      content: a.content,
      mimeType: a.mimeType,
    })),
    metadata: {
      from: email.from,
      subject: email.subject,
      messageId: email.messageId,
      emailThreadId: email.threadId,
      inReplyTo: email.inReplyTo,
      classification: emailClass,
    },
  });

  // Store thread ID on the order for future thread detection
  if (email.threadId) {
    await prisma.order.update({
      where: { id: order.id },
      data: { emailThreadId: email.threadId },
    });
  }

  // Auto-acknowledgement
  const fromEmail = email.from.match(/<([^>]+)>/)?.[1] ?? email.from;
  await sendOrderAcknowledgement(fromEmail, email.subject, order.id).catch(() => {});
}

export function createEmailSyncWorker() {
  return new Worker<EmailSyncJobData>(
    "email-sync",
    async (job: Job<EmailSyncJobData>) => {
      const { workspaceId, integrationId, provider, historyId, messageId } = job.data;

      if (provider === "gmail") {
        const { accessToken, credentials } = await getValidGmailToken(integrationId);
        const creds = credentials as { historyId?: string };
        const startHistoryId = historyId ?? creds.historyId ?? "1";

        let messageIds: string[];
        if (messageId) {
          messageIds = [messageId];
        } else {
          messageIds = await listGmailHistory(accessToken, startHistoryId);
        }

        let lastHistoryId = startHistoryId;
        for (const msgId of messageIds) {
          const email = await getGmailMessage(accessToken, msgId);
          await processEmail(email, workspaceId);
          lastHistoryId = historyId ?? lastHistoryId;
        }

        // Update historyId so next sync starts from here
        if (historyId && historyId !== creds.historyId) {
          await prisma.integration.update({
            where: { id: integrationId },
            data: { credentials: { ...credentials, historyId } },
          });
        }
      } else if (provider === "outlook") {
        if (!messageId) return;
        const { accessToken } = await getValidOutlookToken(integrationId);
        const email = await getOutlookMessage(accessToken, messageId);
        await processEmail(email, workspaceId);
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 2,
    }
  );
}
