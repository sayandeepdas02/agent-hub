import { prisma } from "./prisma";

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

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ channel, text }),
    });
    const data = (await res.json()) as { ok: boolean };

    await prisma.notification.create({
      data: {
        workspaceId,
        channel: `slack:${channel}`,
        payload: { orderId, text, slackOk: data.ok },
        sentAt: data.ok ? new Date() : null,
      },
    });
  } catch {
    // Non-fatal — notification failure must never block the order pipeline
  }
}
