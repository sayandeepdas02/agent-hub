import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";

// Kept for compatibility; BullMQ workers now process jobs automatically.
export async function POST() {
  await requireAuth();
  return NextResponse.json({ message: "Jobs are processed automatically by BullMQ workers." });
}
