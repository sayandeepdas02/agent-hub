"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface WebhookRow {
  id: string;
  url: string;
  eventTypes: string[];
  createdAt: string;
  _count: { deliveries: number };
}

interface Delivery {
  id: string;
  eventType: string;
  statusCode: number | null;
  error: string | null;
  attempt: number;
  deliveredAt: string;
}

const ALL_EVENTS = ["order.completed", "order.review_needed", "order.failed"] as const;

export function WebhooksPanel({ initial }: { initial: WebhookRow[] }) {
  const [webhooks, setWebhooks] = useState<WebhookRow[]>(initial);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["order.completed"]);
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({});
  const [loadingDeliveries, setLoadingDeliveries] = useState<string | null>(null);

  async function createWebhook() {
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, eventTypes: events }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create"); return; }
      setWebhooks((prev) => [{ ...data.webhook, _count: { deliveries: 0 } }, ...prev]);
      setNewSecret(data.webhook.secret);
      setUrl("");
      setEvents(["order.completed"]);
    } finally {
      setCreating(false);
    }
  }

  async function deleteWebhook(id: string) {
    const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    if (res.ok) setWebhooks((prev) => prev.filter((w) => w.id !== id));
  }

  async function loadDeliveries(webhookId: string) {
    if (expanded === webhookId) { setExpanded(null); return; }
    setExpanded(webhookId);
    if (deliveries[webhookId]) return;
    setLoadingDeliveries(webhookId);
    try {
      const res = await fetch(`/api/webhooks/${webhookId}/deliveries`);
      const data = await res.json();
      setDeliveries((prev) => ({ ...prev, [webhookId]: data.deliveries ?? [] }));
    } finally {
      setLoadingDeliveries(null);
    }
  }

  function toggleEvent(e: string) {
    setEvents((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );
  }

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="border border-[var(--color-border)] rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-medium text-[var(--color-ink)]">Register webhook</h2>

        <div>
          <label className="text-xs font-mono text-[var(--color-text-tertiary)] mb-1 block">
            Endpoint URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-service.example.com/hooks"
            className="w-full text-sm px-3 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        <div>
          <p className="text-xs font-mono text-[var(--color-text-tertiary)] mb-2">Events</p>
          <div className="flex flex-wrap gap-2">
            {ALL_EVENTS.map((ev) => (
              <button
                key={ev}
                type="button"
                onClick={() => toggleEvent(ev)}
                className={cn(
                  "text-xs px-2 py-1 rounded border transition-colors",
                  events.includes(ev)
                    ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
                )}
              >
                {ev}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-[var(--color-red)]">{error}</p>}

        <button
          onClick={createWebhook}
          disabled={creating || !url.trim() || events.length === 0}
          className="text-sm px-3 py-1.5 rounded bg-[var(--color-primary)] text-white disabled:opacity-50"
        >
          {creating ? "Creating…" : "Add webhook"}
        </button>
      </div>

      {/* One-time secret banner */}
      {newSecret && (
        <div className="border border-[var(--color-amber)] rounded-lg p-4 space-y-2 bg-[color-mix(in_srgb,var(--color-amber)_8%,transparent)]">
          <p className="text-xs font-medium text-[var(--color-amber)]">
            Save your signing secret — it won't be shown again
          </p>
          <code className="block text-xs font-mono bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded px-3 py-2 break-all text-[var(--color-ink)]">
            {newSecret}
          </code>
          <button
            onClick={() => setNewSecret(null)}
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-ink)]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Webhook list */}
      {webhooks.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">No webhooks registered.</p>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <div className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-mono text-[var(--color-ink)] truncate">{wh.url}</p>
                  <div className="flex flex-wrap gap-1">
                    {wh.eventTypes.map((ev) => (
                      <span
                        key={ev}
                        className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-mono"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => loadDeliveries(wh.id)}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    {expanded === wh.id ? "Hide log" : `Log (${wh._count.deliveries})`}
                  </button>
                  <button
                    onClick={() => deleteWebhook(wh.id)}
                    className="text-xs text-[var(--color-red)] hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Delivery log */}
              {expanded === wh.id && (
                <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                  {loadingDeliveries === wh.id ? (
                    <p className="text-xs text-[var(--color-text-tertiary)] p-4">Loading…</p>
                  ) : (deliveries[wh.id] ?? []).length === 0 ? (
                    <p className="text-xs text-[var(--color-text-tertiary)] p-4">No deliveries yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[var(--color-border)] text-[var(--color-text-tertiary)]">
                            <th className="text-left px-4 py-2 font-mono font-normal">Event</th>
                            <th className="text-left px-4 py-2 font-mono font-normal">Status</th>
                            <th className="text-left px-4 py-2 font-mono font-normal">Attempt</th>
                            <th className="text-left px-4 py-2 font-mono font-normal">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(deliveries[wh.id] ?? []).map((d) => (
                            <tr
                              key={d.id}
                              className="border-b border-[var(--color-border)] last:border-0"
                            >
                              <td className="px-4 py-2 font-mono text-[var(--color-ink)]">
                                {d.eventType}
                              </td>
                              <td className="px-4 py-2">
                                {d.error ? (
                                  <span className="text-[var(--color-red)]" title={d.error}>
                                    {d.statusCode ?? "ERR"}
                                  </span>
                                ) : (
                                  <span className="text-[var(--color-green)]">{d.statusCode}</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                                #{d.attempt}
                              </td>
                              <td className="px-4 py-2 text-[var(--color-text-tertiary)] font-mono whitespace-nowrap">
                                {new Date(d.deliveredAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
