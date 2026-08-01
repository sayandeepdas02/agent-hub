import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "../redis";
import { prisma } from "../prisma";

export interface NotificationJobData {
  workspaceId: string;
  channel: string;
  payload: Record<string, unknown>;
}

export function createNotificationWorker() {
  return new Worker<NotificationJobData>(
    "notification",
    async (job: Job<NotificationJobData>) => {
      const { workspaceId, channel, payload } = job.data;

      if (channel === "slack") {
        const token = process.env.SLACK_BOT_TOKEN;
        const slackChannel = process.env.SLACK_NOTIFY_CHANNEL;
        if (!token || !slackChannel) return;

        const res = await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ channel: slackChannel, text: payload.text }),
        });
        const data = (await res.json()) as { ok: boolean };

        await prisma.notification.create({
          data: {
            workspaceId,
            channel: `slack:${slackChannel}`,
            payload: payload as object,
            sentAt: data.ok ? new Date() : null,
          },
        });
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 20,
    }
  );
}
