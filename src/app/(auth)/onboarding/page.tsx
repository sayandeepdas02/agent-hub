"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function OnboardingPage() {
  const { update } = useSession();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setLoading(true);

    const res = await fetch("/api/workspace/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create workspace");
      setLoading(false);
      return;
    }

    const { workspaceId, workspaceName } = await res.json();

    // Write workspace into the JWT
    await update({ workspaceId, workspaceName, role: "ADMIN" });

    window.location.href = "/";
  }

  return (
    <div className="card">
      <h1
        style={{ fontFamily: "Fraunces, Georgia, serif" }}
        className="text-xl font-semibold mb-2 text-center"
      >
        Create your workspace
      </h1>
      <p className="text-sm text-center mb-6" style={{ color: "var(--color-text-secondary)" }}>
        A workspace is where your team manages orders and agents.
      </p>

      {error && (
        <div
          className="text-sm px-3 py-2 rounded mb-4"
          style={{ background: "var(--color-status-failed-bg)", color: "var(--color-rust)" }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Workspace name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="input-field w-full"
            placeholder="Acme Printing Co."
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? "Creating…" : "Create workspace"}
        </button>
      </form>
    </div>
  );
}
