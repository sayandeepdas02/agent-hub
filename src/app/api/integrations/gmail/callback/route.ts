import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import {
  exchangeGmailCode,
  getGmailAccountEmail,
  setupGmailWatch,
} from "@/lib/gmail";

export async function GET(req: NextRequest) {
  await requireAuth();

  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code || !stateParam) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=gmail_auth_failed", req.url)
    );
  }

  let workspaceId: string;
  try {
    ({ workspaceId } = JSON.parse(
      Buffer.from(stateParam, "base64url").toString()
    ));
  } catch {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=invalid_state", req.url)
    );
  }

  try {
    const tokens = await exchangeGmailCode(code);
    const email = await getGmailAccountEmail(tokens.accessToken);

    // Set up Gmail push notifications (requires GMAIL_PUBSUB_TOPIC to be configured)
    let historyId = "1";
    let watchExpiry: string | undefined;
    const topic = process.env.GMAIL_PUBSUB_TOPIC;
    if (topic) {
      const watch = await setupGmailWatch(tokens.accessToken, topic);
      historyId = watch.historyId;
      watchExpiry = watch.expiration;
    }

    const credentials = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      email,
      historyId,
      ...(watchExpiry ? { watchExpiry } : {}),
    };

    const existing = await prisma.integration.findFirst({
      where: { workspaceId, type: "GMAIL" },
    });

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: { status: "CONNECTED", credentials },
      });
    } else {
      await prisma.integration.create({
        data: { workspaceId, type: "GMAIL", status: "CONNECTED", credentials },
      });
    }

    return NextResponse.redirect(
      new URL("/settings/integrations?connected=gmail", req.url)
    );
  } catch (err) {
    console.error("Gmail callback error:", err);
    return NextResponse.redirect(
      new URL("/settings/integrations?error=gmail_connect_failed", req.url)
    );
  }
}
