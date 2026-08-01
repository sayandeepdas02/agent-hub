"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface FieldDef {
  key: string;
  label: string;
  type: string;
  placeholder: string;
  required: boolean;
}

const FIELD_CONFIG: Record<string, FieldDef[]> = {
  CUSTOM_REST: [
    { key: "url", label: "Webhook URL", type: "url", placeholder: "https://your-server.com/webhook", required: true },
    { key: "secret", label: "HMAC Secret", type: "text", placeholder: "Optional signing secret", required: false },
  ],
  MONDAY: [
    { key: "apiKey", label: "API Key", type: "text", placeholder: "v2.eyJ...", required: true },
    { key: "boardId", label: "Board ID", type: "text", placeholder: "1234567890", required: true },
  ],
  PRINTAVO: [
    { key: "apiKey", label: "API Key", type: "text", placeholder: "pa_...", required: true },
    { key: "subdomain", label: "Subdomain", type: "text", placeholder: "yourcompany", required: true },
  ],
  SHOPWORKS: [
    { key: "apiKey", label: "API Key", type: "text", placeholder: "sw_...", required: true },
  ],
  QUICKBOOKS: [
    { key: "apiKey", label: "Access Token", type: "text", placeholder: "Paste token (OAuth flow coming in Phase 4)", required: true },
  ],
};

interface IntegrationCardProps {
  type: string;
  label: string;
  description: string;
  status: string;
}

export function IntegrationCard({ type, label, description, status }: IntegrationCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<"connect" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const fieldDefs = FIELD_CONFIG[type] ?? [];
  const isConnected = status === "CONNECTED";

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setLoading("connect");
    setError(null);
    try {
      const res = await fetch(`/api/integrations/${type.toLowerCase()}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials: fields }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Failed to connect");
      }
      setOpen(false);
      setFields({});
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(null);
    }
  }

  async function handleDisconnect() {
    setLoading("disconnect");
    setError(null);
    try {
      const res = await fetch(`/api/integrations/${type.toLowerCase()}/disconnect`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(null);
    }
  }

  const dotColor =
    status === "CONNECTED"
      ? "var(--color-green)"
      : status === "ERROR"
      ? "var(--color-rust)"
      : "var(--color-border-strong)";

  const dotLabel =
    status === "CONNECTED" ? "Connected" : status === "ERROR" ? "Error" : "Disconnected";

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{description}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5 text-xs font-mono text-[var(--color-text-secondary)]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
            {dotLabel}
          </span>

          {isConnected ? (
            <button
              onClick={handleDisconnect}
              disabled={loading !== null}
              className="px-3 py-1.5 text-xs font-medium rounded border border-[var(--color-border)] text-[var(--color-rust)] hover:bg-[var(--color-surface-raised)] transition-colors disabled:opacity-50"
            >
              {loading === "disconnect" ? "…" : "Disconnect"}
            </button>
          ) : (
            <button
              onClick={() => { setOpen((o) => !o); setError(null); }}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded border transition-colors",
                open
                  ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-status-pending-bg)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]"
              )}
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {open && !isConnected && (
        <form
          onSubmit={handleConnect}
          className="border-t border-[var(--color-border)] px-4 pb-4 pt-3 bg-[var(--color-surface-raised)] space-y-3"
        >
          {fieldDefs.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-mono text-[var(--color-text-tertiary)] mb-1">
                {f.label}
                {f.required && <span className="text-[var(--color-rust)] ml-0.5">*</span>}
              </label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                required={f.required}
                value={fields[f.key] ?? ""}
                onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full text-sm px-3 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors font-mono"
              />
            </div>
          ))}

          {error && (
            <p className="text-xs font-mono text-[var(--color-rust)]">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading !== null}
              className="px-4 py-1.5 text-xs font-medium rounded bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading === "connect" ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setFields({}); setError(null); }}
              className="px-4 py-1.5 text-xs font-medium rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && isConnected && (
        <p className="px-4 pb-3 text-xs font-mono text-[var(--color-rust)]">{error}</p>
      )}
    </div>
  );
}
