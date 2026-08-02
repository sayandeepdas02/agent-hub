import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { JobsPanel } from "@/components/platform/JobsPanel";

export default async function JobsPage() {
  const { workspaceId } = await requireAuth();

  const jobs = await prisma.job.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  // Live BullMQ queue counts live in the backend service.
  // Pass an empty array here; the panel renders the stats section
  // only when entries are present.
  return <JobsPanel jobs={jobs} queueStats={[]} />;
}
