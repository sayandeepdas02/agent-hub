import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/platform/shell/TopBar";
import { AutomationRulesPanel } from "@/components/platform/AutomationRulesPanel";

export default async function AutomationPage() {
  const workspace = await prisma.workspace.findFirst();

  const rules = workspace
    ? await prisma.automationRule.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <>
      <TopBar section="Automation" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          <div className="mb-6">
            <h1 className="text-xl text-[var(--color-ink)]">Automation Rules</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Rules fire on order events and POST to a webhook URL. Executes as a background job.
            </p>
          </div>

          <AutomationRulesPanel initialRules={rules} />
        </div>
      </main>
    </>
  );
}
