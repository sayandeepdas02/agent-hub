import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { QUEUES } from "@/lib/queue";
import { JobsPanel } from "@/components/platform/JobsPanel";

export default async function JobsPage() {
  const { workspaceId } = await requireAuth();

  const [jobs, queueStats] = await Promise.all([
    prisma.job.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    Promise.all(
      (["extraction", "integration", "automation", "notification", "email-sync"] as const).map(
        async (name) => {
          const raw = await QUEUES[name].getJobCounts(
            "waiting",
            "active",
            "completed",
            "failed",
            "delayed"
          );
          const counts = {
            waiting: raw.waiting ?? 0,
            active: raw.active ?? 0,
            completed: raw.completed ?? 0,
            failed: raw.failed ?? 0,
            delayed: raw.delayed ?? 0,
          };
          return { name, counts };
        }
      )
    ),
  ]);

  return <JobsPanel jobs={jobs} queueStats={queueStats} />;
}
