"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Copy, Check } from "lucide-react";

interface ApiKey {
  id: string;
  label: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export function ApiKeysPanel({ initialKeys }: { initialKeys: ApiKey[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNewKey(null);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) {
        const b = await res.json() as { error?: string };
        throw new Error(b.error ?? "Failed to create key");
      }
      const data = await res.json() as { key: string };
      setNewKey(data.key);
      setLabel("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(key: string) {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRevoke(id: string) {
    setDeleting(id);
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* New key reveal */}
      {newKey && (
        <div className="bg-[var(--color-status-pending-bg)] border border-[var(--color-primary)] rounded-lg p-4 space-y-2">
          <p className="text-xs font-mono text-[var(--color-primary)] font-medium">
            Key created — copy it now. It will never be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-3 py-2 text-[var(--color-text-primary)] overflow-x-auto">
              {newKey}
            </code>
            <button
              onClick={() => handleCopy(newKey)}
              className="shrink-0 p-2 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check size={14} className="text-[var(--color-green)]" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          required
          placeholder="Key label (e.g. ERP integration)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1 text-sm px-3 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        />
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-1.5 text-xs font-medium rounded bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0"
        >
          {saving ? "Creating…" : "Create Key"}
        </button>
      </form>
      {error && <p className="text-xs font-mono text-[var(--color-rust)]">{error}</p>}

      {/* Key list */}
      {initialKeys.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-[var(--color-border)] rounded-lg">
          <p className="text-sm text-[var(--color-text-tertiary)]">No API keys yet.</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            Keys authenticate POST /api/orders requests.
          </p>
        </div>
      ) : (
        <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                <th className="text-left px-4 py-2 text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">Label</th>
                <th className="text-left px-4 py-2 text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">Created</th>
                <th className="text-left px-4 py-2 text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">Last Used</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {initialKeys.map((k, i) => (
                <tr key={k.id} className={i < initialKeys.length - 1 ? "border-b border-[var(--color-border)]" : ""}>
                  <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">{k.label}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">
                    {new Date(k.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleRevoke(k.id)}
                      disabled={deleting === k.id}
                      className="text-xs font-mono text-[var(--color-rust)] hover:underline disabled:opacity-30"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-[var(--color-border)] pt-4">
        <p className="text-xs font-mono text-[var(--color-text-tertiary)]">Usage:</p>
        <pre className="mt-2 text-xs font-mono bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded p-3 overflow-x-auto text-[var(--color-text-secondary)]">{`curl -X POST https://your-domain.com/api/orders \\
  -H "X-Api-Key: ahk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"customerName":"Acme","productSku":"TSHIRT-MD","quantity":24}'`}</pre>
      </div>
    </div>
  );
}
