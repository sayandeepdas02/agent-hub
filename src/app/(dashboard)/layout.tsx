import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/platform/shell/Sidebar";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspace = await prisma.workspace.findFirst({
    include: {
      agentEnrollments: {
        where: { enabled: true },
        include: { agent: true },
      },
    },
  });

  if (!workspace) {
    redirect("/setup");
  }

  const agents = workspace.agentEnrollments.map((e) => ({
    id: e.agent.id,
    name: e.agent.name,
    slug: e.agent.slug,
  }));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar agents={agents} workspaceName={workspace.name} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
