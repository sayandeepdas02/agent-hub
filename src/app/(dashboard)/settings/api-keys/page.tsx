import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { TopBar } from "@/components/platform/shell/TopBar";
import { ApiKeysPanel } from "@/components/platform/ApiKeysPanel";

export default async function ApiKeysPage() {
  const { workspaceId } = await requireAuth();
  const keys = await prisma.apiKey.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, lastUsedAt: true, createdAt: true },
  });

  const serialized = keys.map((k) => ({
    ...k,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  }));

  return (
    <>
      <TopBar section="API Keys" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          <div className="mb-6">
            <h1 className="text-xl text-[var(--color-ink)]">API Keys</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Authenticate programmatic order submissions via{" "}
              <code className="font-mono text-xs">POST /api/orders</code>.
            </p>
          </div>
          <ApiKeysPanel initialKeys={serialized} />
        </div>
      </main>
    </>
  );
}
