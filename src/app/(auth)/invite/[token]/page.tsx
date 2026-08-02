"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

interface InviteInfo {
  email: string;
  role: string;
  workspaceName: string;
  workspaceId: string;
}

export default function InvitePage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const { data: session, update } = useSession();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setInvite(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load invite");
        setLoading(false);
      });
  }, [token]);

  async function accept() {
    if (!session?.user) return;
    setAccepting(true);

    const res = await fetch(`/api/invites/${token}`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to accept invite");
      setAccepting(false);
      return;
    }

    const { workspaceId } = await res.json();
    await update({ workspaceId, workspaceName: invite?.workspaceName, role: invite?.role });
    router.push("/");
  }

  if (loading) {
    return (
      <div className="card text-center">
        <p style={{ color: "var(--color-text-secondary)" }}>Loading invite…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center">
        <p style={{ color: "var(--color-rust)" }} className="mb-3">{error}</p>
        <Link href="/login" style={{ color: "var(--color-primary)" }} className="text-sm">
          Go to sign in
        </Link>
      </div>
    );
  }

  if (!invite) return null;

  return (
    <div className="card text-center">
      <div className="text-3xl mb-3">🎉</div>
      <h1 style={{ fontFamily: "Fraunces, Georgia, serif" }} className="text-xl font-semibold mb-2">
        You&apos;re invited
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
        Join <strong>{invite.workspaceName}</strong> as{" "}
        <span className="capitalize">{invite.role.toLowerCase()}</span>
      </p>

      {session?.user ? (
        session.user.email === invite.email ? (
          <button
            onClick={accept}
            disabled={accepting}
            className="btn-primary w-full"
          >
            {accepting ? "Accepting…" : "Accept invitation"}
          </button>
        ) : (
          <div>
            <p className="text-sm mb-3" style={{ color: "var(--color-rust)" }}>
              This invite is for <strong>{invite.email}</strong>. You&apos;re signed in as{" "}
              <strong>{session.user.email}</strong>.
            </p>
            <button
              onClick={() => signIn(undefined, { callbackUrl: `/invite/${token}` })}
              className="btn-secondary w-full"
            >
              Sign in with a different account
            </button>
          </div>
        )
      ) : (
        <div className="space-y-3">
          <p className="text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
            Sign in or create an account for <strong>{invite.email}</strong> to accept.
          </p>
          <Link
            href={`/login?callbackUrl=/invite/${token}`}
            className="btn-primary block w-full text-center"
          >
            Sign in
          </Link>
          <Link
            href={`/register?callbackUrl=/invite/${token}`}
            className="btn-secondary block w-full text-center"
          >
            Create account
          </Link>
        </div>
      )}
    </div>
  );
}
