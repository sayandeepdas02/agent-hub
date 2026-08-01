import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { buildKey, getSignedUploadUrl } from "@/lib/s3";

export async function POST(req: NextRequest) {
  const { workspaceId } = await requireAuth();
  const { filename, mimeType, sizeBytes } = await req.json();

  if (!filename || !mimeType || typeof sizeBytes !== "number") {
    return NextResponse.json({ error: "filename, mimeType, sizeBytes required" }, { status: 400 });
  }

  const key = buildKey(workspaceId, "uploads", filename);
  const uploadUrl = await getSignedUploadUrl(key, mimeType);

  const fileRef = await prisma.fileRef.create({
    data: {
      workspaceId,
      bucket: process.env.S3_BUCKET ?? "agent-hub",
      key,
      filename,
      mimeType,
      sizeBytes,
    },
  });

  return NextResponse.json({ fileRefId: fileRef.id, key, uploadUrl });
}
