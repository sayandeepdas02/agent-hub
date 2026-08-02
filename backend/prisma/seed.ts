import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const orderIntake = await prisma.agent.upsert({
    where: { id: "order-intake" },
    update: { name: "Order Intake", slug: "order-intake" },
    create: { id: "order-intake", name: "Order Intake", slug: "order-intake" },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "default" },
    update: {},
    create: { name: "My Workspace", slug: "default" },
  });

  await prisma.agentEnrollment.upsert({
    where: { workspaceId_agentId: { workspaceId: workspace.id, agentId: orderIntake.id } },
    update: { enabled: true },
    create: { workspaceId: workspace.id, agentId: orderIntake.id, enabled: true },
  });

  const customers = [
    { name: "Acme Corp", email: "orders@acme.com" },
    { name: "Blue Ridge Apparel", email: "purchasing@blueridge.com" },
    { name: "Sunshine Screenprint", email: "hello@sunshinescreen.com" },
  ];

  for (const c of customers) {
    const id = `seed-customer-${c.name.toLowerCase().replace(/\s+/g, "-")}`;
    await prisma.customer.upsert({
      where: { id },
      update: {},
      create: { id, workspaceId: workspace.id, name: c.name, email: c.email },
    });
  }

  const products = [
    { sku: "TSHIRT-SM", name: "T-Shirt Small" },
    { sku: "TSHIRT-MD", name: "T-Shirt Medium" },
    { sku: "TSHIRT-LG", name: "T-Shirt Large" },
    { sku: "HOODIE-MD", name: "Hoodie Medium" },
    { sku: "HAT-OS", name: "Hat One Size" },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { workspaceId_sku: { workspaceId: workspace.id, sku: p.sku } },
      update: {},
      create: { workspaceId: workspace.id, sku: p.sku, name: p.name },
    });
  }

  console.log(`✓ Workspace: ${workspace.name} (${workspace.id})`);
  console.log(`✓ Agent: ${orderIntake.name}`);
  console.log(`✓ ${customers.length} customers, ${products.length} products`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
