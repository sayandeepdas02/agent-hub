import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { Sidebar } from "@/components/platform/shell/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireAuth();

  const enrollments = await prisma.agentEnrollment.findMany({
    where: { workspaceId: ctx.workspaceId, enabled: true },
    include: { agent: true },
  });

  // All workspaces this user belongs to (for workspace switcher)
  const memberships = await prisma.workspaceMembership.findMany({
    where: { userId: ctx.userId },
    include: { workspace: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const agents = enrollments.map((e) => ({
    id: e.agent.id,
    name: e.agent.name,
    slug: e.agent.slug,
  }));

  const workspaces = memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    role: m.role,
  }));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        agents={agents}
        workspaceName={ctx.workspaceName}
        workspaceId={ctx.workspaceId}
        workspaces={workspaces}
        userName={ctx.userName ?? null}
        userEmail={ctx.userEmail}
        userImage={ctx.userImage ?? null}
        userRole={ctx.role}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
