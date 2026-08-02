import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const enrollment = await prisma.agentEnrollment.findFirst({
    where: { enabled: true },
    include: { agent: true },
  });

  if (enrollment) {
    redirect(`/agents/${enrollment.agent.slug}/dashboard`);
  }

  return (
    <div className="flex flex-1 items-center justify-center text-[var(--color-text-secondary)]">
      No agents enabled. Add an agent enrollment to get started.
    </div>
  );
}
