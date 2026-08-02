import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const { ruleId } = await params;

  const rule = await prisma.automationRule.findUnique({ where: { id: ruleId } });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.automationRule.update({
    where: { id: ruleId },
    data: { enabled: !rule.enabled },
  });

  return NextResponse.json({ enabled: updated.enabled });
}
