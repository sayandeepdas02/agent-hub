"use client";

import { useState } from "react";
import Link from "next/link";

export default function SubmitPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ orderId: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/orders/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json() as { orderId?: string; status?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setResult({ orderId: data.orderId!, status: data.status! });
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const statusLabel: Record<string, string> = {
    COMPLETED: "Auto-processed — no review needed.",
    REVIEW_NEEDED: "Received — a team member will review shortly.",
    FAILED: "Could not process — please contact us directly.",
    PENDING: "Received and queued.",
  };

  const statusColor: Record<string, string> = {
    COMPLETED: "var(--color-green)",
    REVIEW_NEEDED: "var(--color-amber)",
    FAILED: "var(--color-rust)",
    PENDING: "var(--color-text-secondary)",
  };

  return (
    <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">
            Order Intake
          </p>
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Submit an Order</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            Describe your order in plain language. Include customer name, product, quantity, and ship date.
          </p>
        </div>

        {result ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: statusColor[result.status] ?? "var(--color-text-tertiary)" }}
              />
              <p className="text-sm text-[var(--color-text-primary)] font-medium">
                {statusLabel[result.status] ?? "Order received."}
              </p>
            </div>
            <p className="text-xs font-mono text-[var(--color-text-tertiary)]">
              Reference: <span className="text-[var(--color-text-secondary)]">{result.orderId.slice(-8)}</span>
            </p>
            <button
              onClick={() => setResult(null)}
              className="w-full py-2 text-sm font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] transition-colors"
            >
              Submit another order
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">
                Order details
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`e.g. Acme Corp needs 48 units of TSHIRT-MD, ship by Aug 15. Front chest logo, PMS 286C.`}
                rows={6}
                className="w-full text-sm px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-xs font-mono text-[var(--color-rust)]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="w-full py-2.5 text-sm font-medium rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {loading ? "Submitting…" : "Submit Order"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-[var(--color-text-tertiary)]">
          Powered by{" "}
          <Link href="/" className="hover:text-[var(--color-text-secondary)] transition-colors">
            Agent Hub
          </Link>
        </p>
      </div>
    </div>
  );
}
