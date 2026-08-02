import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { TopBar } from "@/components/platform/shell/TopBar";
import { MembersPanel } from "@/components/platform/MembersPanel";
import { redirect } from "next/navigation";

export default async function MembersPage() {
  const ctx = await requireAuth();

  if (ctx.role !== "ADMIN" && ctx.role !== "MANAGER") {
    redirect("/");
  }

  const [members, invites] = await Promise.all([
    prisma.workspaceMembership.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invite.findMany({
      where: { workspaceId: ctx.workspaceId, acceptedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const membersData = members.map((m) => ({
    userId: m.userId,
    role: m.role,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
    isSelf: m.userId === ctx.userId,
  }));

  const invitesData = invites.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    expiresAt: i.expiresAt.toISOString(),
  }));

  return (
    <>
      <TopBar section="Members" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          <div className="mb-6">
            <h1 className="text-xl text-[var(--color-ink)]">Members</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Manage who has access to <strong>{ctx.workspaceName}</strong>.
            </p>
          </div>
          <MembersPanel
            members={membersData}
            invites={invitesData}
            currentUserId={ctx.userId}
            currentRole={ctx.role}
          />
        </div>
      </main>
    </>
  );
}
