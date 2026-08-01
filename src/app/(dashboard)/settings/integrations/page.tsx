import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { TopBar } from "@/components/platform/shell/TopBar";
import { IntegrationCard } from "@/components/platform/IntegrationCard";

const INTEGRATION_TYPES = [
  { type: "CUSTOM_REST", label: "Custom REST", description: "POST order data to any HTTP endpoint" },
  { type: "MONDAY", label: "Monday.com", description: "Create items on Monday boards" },
  { type: "PRINTAVO", label: "Printavo", description: "Push orders to Printavo" },
  { type: "SHOPWORKS", label: "ShopWorks", description: "Sync with ShopWorks" },
  { type: "QUICKBOOKS", label: "QuickBooks", description: "Invoice and accounting sync" },
] as const;

export default async function IntegrationsPage() {
  const { workspaceId } = await requireAuth();
  const integrations = await prisma.integration.findMany({ where: { workspaceId } });
  const byType = Object.fromEntries(integrations.map((i) => [i.type, i]));

  return (
    <>
      <TopBar section="Integrations" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-4">
          <div className="mb-6">
            <h1 className="text-xl text-[var(--color-ink)]">Integrations</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Connected integrations fire on every completed order across all agents.
            </p>
          </div>

          {INTEGRATION_TYPES.map(({ type, label, description }) => (
            <IntegrationCard
              key={type}
              type={type}
              label={label}
              description={description}
              status={byType[type]?.status ?? "DISCONNECTED"}
            />
          ))}
        </div>
      </main>
    </>
  );
}
