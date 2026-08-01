import { NextResponse } from "next/server";
import { processJobs } from "@/lib/jobs";

export async function POST() {
  const result = await processJobs();
  return NextResponse.json(result);
}
