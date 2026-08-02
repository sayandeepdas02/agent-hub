"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemberRole } from "@prisma/client";

interface MemberRow {
  userId: string;
  role: MemberRole;
  name: string | null;
  email: string;
  image: string | null;
  isSelf: boolean;
}

interface InviteRow {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: string;
}

const ROLES: MemberRole[] = ["ADMIN", "MANAGER", "REVIEWER", "OPERATOR", "VIEWER"];

export function MembersPanel({
  members,
  invites,
  currentUserId,
  currentRole,
}: {
  members: MemberRow[];
  invites: InviteRow[];
  currentUserId: string;
  currentRole: MemberRole;
}) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("OPERATOR");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const canManage = currentRole === "ADMIN" || currentRole === "MANAGER";

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setInviting(true);

    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });

    setInviting(false);
    if (!res.ok) {
      const data = await res.json();
      setInviteError(data.error ?? "Failed to send invite");
    } else {
      setInviteSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      router.refresh();
    }
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this member?")) return;
    await fetch(`/api/workspace/members/${userId}`, { method: "DELETE" });
    router.refresh();
  }

  async function changeRole(userId: string, role: MemberRole) {
    await fetch(`/api/workspace/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Current members */}
      <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-[var(--color-surface)]">
        <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
          <h2 className="text-sm font-semibold">Team members</h2>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 px-4 py-3">
              <div
                className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold"
                style={{ background: "var(--color-primary)", color: "#fff" }}
              >
                {(m.name ?? m.email)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {m.name && <p className="text-sm font-medium truncate">{m.name}</p>}
                <p className="text-xs truncate" style={{ color: "var(--color-text-tertiary)" }}>
                  {m.email}
                  {m.isSelf && " (you)"}
                </p>
              </div>

              {canManage && !m.isSelf ? (
                <select
                  value={m.role}
                  onChange={(e) => changeRole(m.userId, e.target.value as MemberRole)}
                  className="input-field text-xs py-1"
                  style={{ minWidth: 90 }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--color-border)] font-mono">
                  {m.role.toLowerCase()}
                </span>
              )}

              {canManage && !m.isSelf && (
                <button
                  onClick={() => removeMember(m.userId)}
                  className="text-xs px-2 py-1 rounded hover:bg-[var(--color-status-failed-bg)] transition-colors"
                  style={{ color: "var(--color-rust)" }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-[var(--color-surface)]">
          <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
            <h2 className="text-sm font-semibold">Pending invites</h2>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{inv.email}</p>
                  <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                    {inv.role.toLowerCase()} · expires{" "}
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-status-pending-bg)] text-[var(--color-primary)]">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite form */}
      {canManage && (
        <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] p-4">
          <h2 className="text-sm font-semibold mb-3">Invite someone</h2>

          {inviteError && (
            <p className="text-xs mb-2" style={{ color: "var(--color-rust)" }}>
              {inviteError}
            </p>
          )}
          {inviteSuccess && (
            <p className="text-xs mb-2" style={{ color: "var(--color-green)" }}>
              {inviteSuccess}
            </p>
          )}

          <form onSubmit={sendInvite} className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder="colleague@company.com"
              className="input-field flex-1"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as MemberRole)}
              className="input-field"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="btn-primary shrink-0"
            >
              {inviting ? "Sending…" : "Invite"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
