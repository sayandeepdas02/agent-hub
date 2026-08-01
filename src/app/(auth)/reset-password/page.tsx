"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Reset failed");
    } else {
      router.push("/login?reset=1");
    }
  }

  if (!token) {
    return (
      <div className="card text-center">
        <p style={{ color: "var(--color-rust)" }}>Invalid reset link.</p>
        <Link href="/forgot-password" style={{ color: "var(--color-primary)" }} className="text-sm mt-2 inline-block">
          Request a new one
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <h1
        style={{ fontFamily: "Fraunces, Georgia, serif" }}
        className="text-xl font-semibold mb-6 text-center"
      >
        Set new password
      </h1>

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
          <label className="block text-sm font-medium mb-1">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoFocus
            className="input-field w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="input-field w-full"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? "Saving…" : "Set password"}
        </button>
      </form>
    </div>
  );
}
