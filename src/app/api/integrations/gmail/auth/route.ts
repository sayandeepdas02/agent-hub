import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { getGmailAuthUrl } from "@/lib/gmail";

export async function GET() {
  const { workspaceId } = await requireAuth();
  const state = Buffer.from(JSON.stringify({ workspaceId })).toString("base64url");
  return NextResponse.redirect(getGmailAuthUrl(state));
}
