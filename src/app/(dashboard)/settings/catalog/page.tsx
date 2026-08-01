import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/platform/shell/TopBar";
import { CatalogPanel } from "@/components/platform/CatalogPanel";

export default async function CatalogPage() {
  const workspace = await prisma.workspace.findFirst();

  const [customers, products] = workspace
    ? await Promise.all([
        prisma.customer.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
        prisma.product.findMany({ where: { workspaceId: workspace.id }, orderBy: { sku: "asc" } }),
      ])
    : [[], []];

  return (
    <>
      <TopBar section="Catalog" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl">
          <div className="mb-6">
            <h1 className="text-xl text-[var(--color-ink)]">Catalog</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Customers and products used for fuzzy matching during order extraction.
            </p>
          </div>
          <CatalogPanel customers={customers} products={products} />
        </div>
      </main>
    </>
  );
}
