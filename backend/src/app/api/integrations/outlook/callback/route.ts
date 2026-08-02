import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { exchangeOutlookCode, createOutlookSubscription } from "@/lib/outlook";

export async function GET(req: NextRequest) {
  await requireAuth();

  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code || !stateParam) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=outlook_auth_failed", req.url)
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
    const tokens = await exchangeOutlookCode(code);

    // Create Graph API subscription for Inbox
    const notificationUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/webhooks/outlook`;
    let subscriptionId: string | undefined;
    try {
      subscriptionId = await createOutlookSubscription(tokens.accessToken, notificationUrl);
    } catch {
      // Non-fatal in local dev (requires public HTTPS URL)
    }

    const credentials = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      email: tokens.email,
      ...(subscriptionId ? { subscriptionId } : {}),
    };

    const existing = await prisma.integration.findFirst({
      where: { workspaceId, type: "OUTLOOK" },
    });

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: { status: "CONNECTED", credentials },
      });
    } else {
      await prisma.integration.create({
        data: { workspaceId, type: "OUTLOOK", status: "CONNECTED", credentials },
      });
    }

    return NextResponse.redirect(
      new URL("/settings/integrations?connected=outlook", req.url)
    );
  } catch (err) {
    console.error("Outlook callback error:", err);
    return NextResponse.redirect(
      new URL("/settings/integrations?error=outlook_connect_failed", req.url)
    );
  }
}
