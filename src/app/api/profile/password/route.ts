import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: "Use your OAuth provider to change your password" },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: ctx.userId }, data: { passwordHash: newHash } });

  return NextResponse.json({ ok: true });
}
