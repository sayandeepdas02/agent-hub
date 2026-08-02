import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { TopBar } from "@/components/platform/shell/TopBar";
import { WebhooksPanel } from "@/components/platform/WebhooksPanel";

export default async function WebhooksPage() {
  const { workspaceId } = await requireAuth();
  const webhooks = await prisma.webhook.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { deliveries: true } } },
  });

  const serializable = webhooks.map((w) => ({
    ...w,
    createdAt: w.createdAt.toISOString(),
  }));

  return (
    <>
      <TopBar section="Webhooks" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-4">
          <div className="mb-6">
            <h1 className="text-xl text-[var(--color-ink)]">Webhooks</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Register HTTPS endpoints to receive signed event payloads when orders change state.
              Each delivery is signed with{" "}
              <code className="font-mono text-xs">X-Hub-Signature-256</code>.
            </p>
          </div>
          <WebhooksPanel initial={serializable} />
        </div>
      </main>
    </>
  );
}
