import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mail";
import { randomBytes } from "crypto";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return 200 to avoid user enumeration
  if (user) {
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing reset token for this user
    await prisma.verificationToken.deleteMany({
      where: { identifier: `password-reset:${email}` },
    });

    await prisma.verificationToken.create({
      data: { identifier: `password-reset:${email}`, token, expires },
    });

    await sendPasswordResetEmail(email, token).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
