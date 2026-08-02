"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="card text-center">
        <div className="text-4xl mb-4">📬</div>
        <h1 style={{ fontFamily: "Fraunces, Georgia, serif" }} className="text-xl font-semibold mb-2">
          Check your email
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          If an account exists for {email}, we sent a password reset link.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm"
          style={{ color: "var(--color-primary)" }}
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h1
          style={{ fontFamily: "Fraunces, Georgia, serif" }}
          className="text-xl font-semibold mb-2 text-center"
        >
          Reset password
        </h1>
        <p className="text-sm text-center mb-6" style={{ color: "var(--color-text-secondary)" }}>
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="input-field w-full"
              placeholder="you@company.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm mt-4" style={{ color: "var(--color-text-secondary)" }}>
        <Link href="/login" style={{ color: "var(--color-primary)" }}>
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
