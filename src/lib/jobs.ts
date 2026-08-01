import { prisma } from "./prisma";
import { QUEUES, type QueueName } from "./queue";

export type JobType =
  | "order_extraction"
  | "integration_dispatch"
  | "automation_http_post";

interface EnqueueParams {
  workspaceId: string;
  agentId?: string;
  type: JobType;
  queueName: QueueName;
  payload: object;
}

export async function enqueueJob(params: EnqueueParams) {
  const job = await prisma.job.create({
    data: {
      workspaceId: params.workspaceId,
      agentId: params.agentId,
      type: params.type,
      queueName: params.queueName,
      payload: params.payload,
      status: "PENDING",
    },
  });

  const queue = QUEUES[params.queueName];
  await queue.add(params.type, { prismaJobId: job.id, ...params.payload });

  return job;
}
