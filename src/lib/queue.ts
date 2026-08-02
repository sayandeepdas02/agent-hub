import { Queue } from "bullmq";
import { getRedisConnection } from "./redis";

const base = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2000 },
  removeOnComplete: { age: 7 * 24 * 3600, count: 1000 },
  removeOnFail: { age: 30 * 24 * 3600, count: 5000 },
};

function makeQueue(name: string, overrides: Partial<typeof base> = {}) {
  return new Queue(name, {
    connection: getRedisConnection(),
    defaultJobOptions: { ...base, ...overrides },
  });
}

export const extractionQueue = makeQueue("extraction");
export const integrationQueue = makeQueue("integration", { attempts: 5 });
export const automationQueue = makeQueue("automation");
export const notificationQueue = makeQueue("notification");
export const emailSyncQueue = makeQueue("email-sync", { attempts: 2 });

export const QUEUES = {
  extraction: extractionQueue,
  integration: integrationQueue,
  automation: automationQueue,
  notification: notificationQueue,
  "email-sync": emailSyncQueue,
} as const;

export type QueueName = keyof typeof QUEUES;
