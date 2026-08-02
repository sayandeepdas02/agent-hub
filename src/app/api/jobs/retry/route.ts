import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { QUEUES, type QueueName } from "@/lib/queue";

export async function POST(req: NextRequest) {
  const { workspaceId } = await requireAuth();
  const { jobId } = await req.json();

  const job = await prisma.job.findFirst({
    where: { id: jobId, workspaceId, status: "FAILED" },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "PENDING", error: null, attempts: 0 },
  });

  const queue = QUEUES[job.queueName as QueueName];
  if (queue) {
    await queue.add(job.type, {
      prismaJobId: job.id,
      ...(job.payload as object),
    });
  }

  return NextResponse.json({ ok: true });
}
