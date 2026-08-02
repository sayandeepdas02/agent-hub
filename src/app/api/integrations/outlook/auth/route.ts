import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { getOutlookAuthUrl } from "@/lib/outlook";

export async function GET() {
  const { workspaceId } = await requireAuth();
  const state = Buffer.from(JSON.stringify({ workspaceId })).toString("base64url");
  return NextResponse.redirect(getOutlookAuthUrl(state));
}
