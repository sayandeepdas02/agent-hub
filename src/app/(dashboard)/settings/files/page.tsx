import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/platform/shell/TopBar";
import { FilesPanel } from "@/components/platform/FilesPanel";

const PAGE_SIZE = 50;

export default async function FilesPage() {
  const { workspaceId } = await requireAuth();

  const files = await prisma.fileRef.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
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

  const serialized = page.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
  }));

  return (
    <>
      <TopBar section="Files" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl">
          <div className="mb-6">
            <h1 className="text-xl text-[var(--color-ink)]">Files</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              All files uploaded to this workspace. Download or delete individual
              files; new uploads come through{" "}
              <code className="font-mono text-xs">POST /api/files/upload</code>.
            </p>
          </div>
          <FilesPanel initialFiles={serialized} initialNextCursor={nextCursor} />
        </div>
      </main>
    </>
  );
}
