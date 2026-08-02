import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const { workspaceId } = await requireAuth();

  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor") ?? undefined;
  const search = searchParams.get("q") ?? undefined;

  const files = await prisma.fileRef.findMany({
    where: {
      workspaceId,
      ...(search
        ? { filename: { contains: search, mode: "insensitive" } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      filename: true,
      mimeType: true,
      sizeBytes: true,
      key: true,
      version: true,
      createdAt: true,
    },
  });

  const hasMore = files.length > PAGE_SIZE;
  const page = hasMore ? files.slice(0, PAGE_SIZE) : files;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return NextResponse.json({
    files: page.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() })),
    nextCursor,
  });
}
