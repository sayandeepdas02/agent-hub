import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { token, password } = parsed.data;
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (
    !record ||
    !record.identifier.startsWith("password-reset:") ||
    record.expires < new Date()
  ) {
    return NextResponse.json(
      { error: "Invalid or expired reset link" },
      { status: 400 }
    );
  }

  const email = record.identifier.replace("password-reset:", "");
  const passwordHash = await bcrypt.hash(password, 12);

  await Promise.all([
    prisma.user.update({ where: { email }, data: { passwordHash } }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  return NextResponse.json({ ok: true });
}
