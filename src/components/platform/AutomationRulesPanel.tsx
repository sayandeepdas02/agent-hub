"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Trash2, Plus } from "lucide-react";

interface Rule {
  id: string;
  name: string;
  trigger: string;
  steps: unknown;
  enabled: boolean;
}

const TRIGGERS = [
  { value: "order.completed", label: "Order Completed" },
  { value: "order.needs_review", label: "Order Needs Review" },
  { value: "order.received", label: "Order Received" },
];

interface AutomationRulesPanelProps {
  initialRules: Rule[];
}

export function AutomationRulesPanel({ initialRules }: AutomationRulesPanelProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("order.completed");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, trigger, url }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Failed to create rule");
      }
      setName("");
      setTrigger("order.completed");
      setUrl("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(ruleId: string) {
    setToggling(ruleId);
    try {
      await fetch(`/api/automation/${ruleId}/toggle`, { method: "POST" });
      router.refresh();
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(ruleId: string) {
    setDeleting(ruleId);
    try {
      await fetch(`/api/automation/${ruleId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-3">
      {initialRules.length === 0 && !showForm && (
        <div className="text-center py-12 border border-dashed border-[var(--color-border)] rounded-lg">
          <p className="text-sm text-[var(--color-text-tertiary)]">No automation rules yet.</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            Rules POST order data to a URL when events fire.
          </p>
        </div>
      )}

      {initialRules.map((rule) => {
        const steps = rule.steps as Array<{ type: string; url?: string }>;
        const httpStep = steps.find((s) => s.type === "http_post");
        const triggerLabel = TRIGGERS.find((t) => t.value === rule.trigger)?.label ?? rule.trigger;

        return (
          <div
            key={rule.id}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {rule.name}
                </p>
                <p className="text-xs font-mono text-[var(--color-text-tertiary)] mt-0.5">
                  {triggerLabel} → POST {httpStep?.url ?? "—"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Toggle */}
                <button
                  onClick={() => handleToggle(rule.id)}
                  disabled={toggling === rule.id}
                  title={rule.enabled ? "Disable rule" : "Enable rule"}
                  className={cn(
                    "w-8 h-4 rounded-full transition-colors relative shrink-0 disabled:opacity-50",
                    rule.enabled
                      ? "bg-[var(--color-primary)]"
                      : "bg-[var(--color-border-strong)]"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform",
                      rule.enabled ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(rule.id)}
                  disabled={deleting === rule.id}
                  title="Delete rule"
                  className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-rust)] transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {showForm ? (
        <form
          onSubmit={handleCreate}
          className="bg-[var(--color-surface)] border border-[var(--color-primary)] rounded-lg p-4 space-y-3"
        >
          <p className="text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">
            New Rule
          </p>

          <div>
            <label className="block text-xs font-mono text-[var(--color-text-tertiary)] mb-1">
              Name <span className="text-[var(--color-rust)]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Notify ERP on completion"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm px-3 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[var(--color-text-tertiary)] mb-1">
              Trigger <span className="text-[var(--color-rust)]">*</span>
            </label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className="w-full text-sm px-3 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            >
              {TRIGGERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-[var(--color-text-tertiary)] mb-1">
              Webhook URL (HTTP POST) <span className="text-[var(--color-rust)]">*</span>
            </label>
            <input
              type="url"
              required
              placeholder="https://your-server.com/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full text-sm px-3 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors font-mono"
            />
          </div>

          {formError && (
            <p className="text-xs font-mono text-[var(--color-rust)]">{formError}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 text-xs font-medium rounded bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? "Creating…" : "Create Rule"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null); }}
              className="px-4 py-1.5 text-xs font-medium rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[var(--color-text-secondary)] border border-dashed border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
        >
          <Plus size={14} />
          New Rule
        </button>
      )}
    </div>
  );
}
