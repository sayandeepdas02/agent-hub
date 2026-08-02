import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailSyncQueue } from "@/lib/queue";

interface OutlookNotification {
  value: Array<{
    subscriptionId: string;
    clientState: string;
    changeType: string;
    resource: string;
    resourceData?: { id?: string };
  }>;
}

export async function POST(req: NextRequest) {
  // Microsoft validation: respond with the validationToken to confirm the endpoint
  const validationToken = req.nextUrl.searchParams.get("validationToken");
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const body = await req.json() as OutlookNotification;

  for (const notification of body.value ?? []) {
    if (notification.clientState !== "agent-hub") continue;

    const integration = await prisma.integration.findFirst({
      where: {
        type: "OUTLOOK",
        status: "CONNECTED",
      },
    });

    if (!integration) continue;

    // Verify subscriptionId matches
    const creds = integration.credentials as { subscriptionId?: string };
    if (creds.subscriptionId && creds.subscriptionId !== notification.subscriptionId) continue;

    const messageId = notification.resourceData?.id;
    if (!messageId) continue;

    await emailSyncQueue.add("outlook_message", {
      workspaceId: integration.workspaceId,
      integrationId: integration.id,
      provider: "outlook",
      messageId,
    });
  }

  return NextResponse.json({ ok: true });
}
