import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailSyncQueue } from "@/lib/queue";

// Google Cloud PubSub push notification format
interface PubSubMessage {
  message: {
    data: string; // base64-encoded JSON
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

interface GmailPushData {
  emailAddress: string;
  historyId: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as PubSubMessage;

  let pushData: GmailPushData;
  try {
    pushData = JSON.parse(
      Buffer.from(body.message.data, "base64").toString("utf-8")
    );
  } catch {
    return NextResponse.json({ error: "Invalid PubSub payload" }, { status: 400 });
  }

  // Find the Gmail integration by email
  const integrations = await prisma.integration.findMany({
    where: { type: "GMAIL", status: "CONNECTED" },
  });

  const match = integrations.find((i) => {
    const creds = i.credentials as { email?: string };
    return creds.email === pushData.emailAddress;
  });

  if (!match) {
    return NextResponse.json({ ok: true }); // No workspace for this email, ignore
  }

  await emailSyncQueue.add("gmail_push", {
    workspaceId: match.workspaceId,
    integrationId: match.id,
    provider: "gmail",
    historyId: pushData.historyId,
  });

  return NextResponse.json({ ok: true });
}
