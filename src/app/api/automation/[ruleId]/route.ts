import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const { ruleId } = await params;

  const rule = await prisma.automationRule.findUnique({ where: { id: ruleId } });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.automationRule.delete({ where: { id: ruleId } });

  return NextResponse.json({ ok: true });
}
