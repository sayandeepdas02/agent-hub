import { notificationQueue } from "./queue";

export async function notifySlackReviewNeeded(
  orderId: string,
  workspaceId: string,
  reasons: string[]
) {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_NOTIFY_CHANNEL;
  if (!token || !channel) return;

  const shortId = orderId.slice(-8);
  const text = `*Order needs review:* \`${shortId}\`\n${reasons.map((r) => `• ${r}`).join("\n")}`;

  await notificationQueue.add("slack_review_needed", {
    workspaceId,
    channel: "slack",
    payload: { orderId, text },
  });
}
