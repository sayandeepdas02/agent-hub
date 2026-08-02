"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const verifyRequest = searchParams.get("verify");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  async function handleGoogle() {
    await signIn("google", { callbackUrl });
  }

  if (verifyRequest) {
    return (
      <div className="card text-center">
        <div className="text-4xl mb-4">📬</div>
        <h1 style={{ fontFamily: "Fraunces, Georgia, serif" }} className="text-xl font-semibold mb-2">
          Check your email
        </h1>
        <p style={{ color: "var(--color-text-secondary)" }} className="text-sm">
          We sent a magic link to your email address. Click it to sign in.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h1
          style={{ fontFamily: "Fraunces, Georgia, serif" }}
          className="text-xl font-semibold mb-6 text-center"
        >
          Welcome back
        </h1>

        {error && (
          <div
            className="text-sm px-3 py-2 rounded mb-4"
            style={{
              background: "var(--color-status-failed-bg)",
              color: "var(--color-rust)",
            }}
          >
            {error}
          </div>
        )}

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
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">Password</label>
              <Link
                href="/forgot-password"
                className="text-xs"
                style={{ color: "var(--color-primary)" }}
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-field w-full"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <hr style={{ borderColor: "var(--color-border)", flex: 1 }} />
          <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            or
          </span>
          <hr style={{ borderColor: "var(--color-border)", flex: 1 }} />
        </div>

        <button
          onClick={handleGoogle}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </div>

      <p className="text-center text-sm mt-4" style={{ color: "var(--color-text-secondary)" }}>
        Don&apos;t have an account?{" "}
        <Link href="/register" style={{ color: "var(--color-primary)" }}>
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
