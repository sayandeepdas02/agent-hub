"use client";

import { useState } from "react";

interface Props {
  name: string;
  email: string;
  image: string | null;
}

export function ProfilePanel({ name: initialName, email, image }: Props) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
    else setSaveError("Failed to save");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwError("Passwords do not match");
      return;
    }
    setPwError("");
    setPwSaving(true);
    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    setPwSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setPwError(data.error ?? "Failed to update password");
    } else {
      setPwSuccess(true);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic info */}
      <div className="card">
        <h2 className="text-sm font-semibold mb-4">Account</h2>
        <div className="mb-4">
          <p className="text-sm font-medium mb-1">Email</p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {email}
          </p>
        </div>
        <form onSubmit={saveName}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Display name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field w-full"
            />
          </div>
          {saveError && (
            <p className="text-xs mb-2" style={{ color: "var(--color-rust)" }}>
              {saveError}
            </p>
          )}
          {saved && (
            <p className="text-xs mb-2" style={{ color: "var(--color-green)" }}>
              Saved
            </p>
          )}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="card">
        <h2 className="text-sm font-semibold mb-4">Change password</h2>
        {pwSuccess && (
          <p className="text-xs mb-3" style={{ color: "var(--color-green)" }}>
            Password updated successfully
          </p>
        )}
        {pwError && (
          <p className="text-xs mb-3" style={{ color: "var(--color-rust)" }}>
            {pwError}
          </p>
        )}
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Current password</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New password</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              minLength={8}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm new password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
              className="input-field w-full"
            />
          </div>
          <button type="submit" disabled={pwSaving} className="btn-primary">
            {pwSaving ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
