"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Download, Search, FileText } from "lucide-react";

interface FileItem {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  key: string;
  version: number;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesPanel({
  initialFiles,
  initialNextCursor,
}: {
  initialFiles: FileItem[];
  initialNextCursor: string | null;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [search, setSearch] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`/api/files?${params}`);
    if (!res.ok) return;
    const data = await res.json() as { files: FileItem[]; nextCursor: string | null };
    setFiles(data.files);
    setNextCursor(data.nextCursor);
  }, []);

  async function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setSearch(q);
    await runSearch(q);
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ cursor: nextCursor });
      if (search) params.set("q", search);
      const res = await fetch(`/api/files?${params}`);
      const data = await res.json() as { files: FileItem[]; nextCursor: string | null };
      setFiles((prev) => [...prev, ...data.files]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleDelete(file: FileItem) {
    if (!confirm(`Delete "${file.filename}"? This cannot be undone.`)) return;
    setDeleting(file.id);
    setError(null);
    try {
      const encodedKey = file.key.split("/").map(encodeURIComponent).join("/");
      const res = await fetch(`/api/files/${encodedKey}`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json() as { error?: string };
        throw new Error(b.error ?? "Delete failed");
      }
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none"
        />
        <input
          type="search"
          placeholder="Search by filename…"
          value={search}
          onChange={handleSearch}
          className="w-full pl-9 pr-3 py-1.5 text-sm rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        />
      </div>

      {error && (
        <p className="text-xs font-mono text-[var(--color-rust)]">{error}</p>
      )}

      {/* File list */}
      {files.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[var(--color-border)] rounded-lg">
          <FileText
            size={28}
            className="mx-auto mb-3 text-[var(--color-text-tertiary)]"
          />
          <p className="text-sm text-[var(--color-text-tertiary)]">
            {search ? "No files match your search." : "No files uploaded yet."}
          </p>
        </div>
      ) : (
        <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                <th className="text-left px-4 py-2 text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Filename
                </th>
                <th className="text-left px-4 py-2 text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider hidden sm:table-cell">
                  Type
                </th>
                <th className="text-left px-4 py-2 text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Size
                </th>
                <th className="text-left px-4 py-2 text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider hidden md:table-cell">
                  Uploaded
                </th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {files.map((f, i) => (
                <tr
                  key={f.id}
                  className={
                    i < files.length - 1
                      ? "border-b border-[var(--color-border)]"
                      : ""
                  }
                >
                  <td className="px-4 py-2.5 text-[var(--color-text-primary)] font-medium max-w-xs truncate">
                    {f.filename}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)] hidden sm:table-cell">
                    {f.mimeType}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
                    {formatBytes(f.sizeBytes)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)] hidden md:table-cell whitespace-nowrap">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/api/files/${f.key.split("/").map(encodeURIComponent).join("/")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-colors"
                        title="Download"
                      >
                        <Download size={14} />
                      </a>
                      <button
                        onClick={() => handleDelete(f)}
                        disabled={deleting === f.id}
                        className="p-1 rounded text-[var(--color-rust)] hover:bg-[var(--color-surface-raised)] transition-colors disabled:opacity-30"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor && (
        <div className="text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-4 py-1.5 text-xs font-medium rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] disabled:opacity-50 transition-colors"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
