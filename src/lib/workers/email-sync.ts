import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "../redis";

export interface EmailSyncJobData {
  workspaceId: string;
  integrationId: string;
}

// Stub: full Gmail/Outlook sync implemented in Sprint 3
export function createEmailSyncWorker() {
  return new Worker<EmailSyncJobData>(
    "email-sync",
    async (_job: Job<EmailSyncJobData>) => {
      // Sprint 3: incremental sync with Gmail/Outlook webhooks
    },
    {
      connection: getRedisConnection(),
      concurrency: 2,
    }
  );
}
