import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl, deleteFile } from "@/lib/s3";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { workspaceId } = await requireAuth();
  const { key: keySegments } = await params;
  const key = keySegments.join("/");

  const fileRef = await prisma.fileRef.findFirst({
    where: { key, workspaceId },
  });
  if (!fileRef) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await getSignedDownloadUrl(key);
  return NextResponse.redirect(url);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { workspaceId } = await requireAuth();
  const { key: keySegments } = await params;
  const key = keySegments.join("/");

  const fileRef = await prisma.fileRef.findFirst({
    where: { key, workspaceId },
  });
  if (!fileRef) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await Promise.all([
    deleteFile(key),
    prisma.fileRef.delete({ where: { id: fileRef.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
