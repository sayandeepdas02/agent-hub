import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(100),
});

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 50);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const { name } = parsed.data;
  let slug = toSlug(name);

  // Ensure unique slug
  const existing = await prisma.workspace.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const workspace = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({ data: { name, slug } });
    await tx.workspaceMembership.create({
      data: { workspaceId: ws.id, userId: session.user.id, role: "ADMIN" },
    });
    // Enroll the order-intake agent by default
    await tx.agentEnrollment.create({
      data: {
        workspaceId: ws.id,
        agentId: "order-intake",
        enabled: true,
      },
    }).catch(() => {}); // ignore if agent row doesn't exist yet
    return ws;
  });

  return NextResponse.json(
    { workspaceId: workspace.id, workspaceName: workspace.name },
    { status: 201 }
  );
}
