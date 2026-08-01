import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";

const schema = z.object({ name: z.string().min(1).max(100) });

export async function PATCH(req: NextRequest) {
  const ctx = await requireAuth();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: ctx.userId },
    data: { name: parsed.data.name },
  });

  return NextResponse.json({ ok: true });
}
