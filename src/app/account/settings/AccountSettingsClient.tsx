"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

interface Props {
  user: { id: string; email: string | null; name: string | null; battletag: string; image: string | null };
  hasBnet: boolean;
  hasPassword: boolean;
  linkedProviders: string[];
}

const inputStyle = {
  background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)",
  color: "#e8dfc8", borderRadius: "0.375rem",
  padding: "0.5rem 0.75rem", width: "100%", fontSize: "0.875rem", outline: "none",
};
const labelStyle = {
  display: "block", fontSize: "0.75rem", marginBottom: "0.375rem",
  textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "#5a5040",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-6 space-y-4"
      style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.15)" }}>
      <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#c8a96a" }}>{title}</h2>
      {children}
    </div>
  );
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className="rounded px-4 py-2 text-sm"
      style={{
        background: ok ? "rgba(50,200,100,0.1)" : "rgba(200,50,50,0.1)",
        border: `1px solid ${ok ? "rgba(50,200,100,0.3)" : "rgba(200,50,50,0.3)"}`,
        color: ok ? "#80f0a0" : "#f08080",
      }}>
      {msg}
    </div>
  );
}

export default function AccountSettingsClient({ user, hasBnet, hasPassword }: Props) {
  // Password change
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  // Display name
  const [displayName, setDisplayName] = useState(user.name ?? "");
  const [nameMsg, setNameMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [nameLoading, setNameLoading] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ text: "Passwords do not match", ok: false }); return; }
    setPwLoading(true);
    const res = await fetch("/api/account/change-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
    });
    const data = await res.json();
    setPwMsg({ text: data.error ?? "Password updated ✓", ok: !data.error });
    if (!data.error) setPwForm({ current: "", next: "", confirm: "" });
    setPwLoading(false);
  }

  async function updateName(e: React.FormEvent) {
    e.preventDefault();
    setNameMsg(null);
    setNameLoading(true);
    const res = await fetch("/api/account/update-name", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: displayName }),
    });
    const data = await res.json();
    setNameMsg({ text: data.error ?? "Name updated ✓", ok: !data.error });
    setNameLoading(false);
  }

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto space-y-6" style={{ color: "#e8dfc8" }}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#f0c040" }}>Account Settings</h1>
          <p className="text-sm mt-1" style={{ color: "#5a5040" }}>
            {user.email ?? user.battletag}
          </p>
        </div>
        <Link href="/" className="wow-btn-ghost text-sm">← Back to Dashboard</Link>
      </div>

      {/* Battle.net */}
      <Section title="Battle.net">
        {hasBnet ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: "#e8dfc8" }}>🎮 {user.battletag}</p>
              <p className="text-xs mt-0.5" style={{ color: "#5a5040" }}>Battle.net account linked</p>
            </div>
            <span className="text-xs px-2 py-1 rounded"
              style={{ background: "rgba(50,200,100,0.1)", border: "1px solid rgba(50,200,100,0.3)", color: "#80f0a0" }}>
              ✓ Connected
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm" style={{ color: "#8a8070" }}>No Battle.net account linked.</p>
              <p className="text-xs mt-0.5" style={{ color: "#5a5040" }}>Link to import your characters and guild rank automatically.</p>
            </div>
            <button onClick={() => { window.location.href = "/api/auth/link-battlenet?returnTo=/account/settings"; }} className="wow-btn text-sm shrink-0">
              🔗 Link Battle.net
            </button>
          </div>
        )}
      </Section>

      {/* Display name */}
      <Section title="Display Name">
        <form onSubmit={updateName} className="space-y-3">
          <div>
            <label style={labelStyle}>Name shown on the dashboard</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              style={inputStyle} placeholder="Your display name" />
          </div>
          {nameMsg && <Toast msg={nameMsg.text} ok={nameMsg.ok} />}
          <button type="submit" disabled={nameLoading} className="wow-btn text-sm">
            {nameLoading ? "Saving…" : "Save Name"}
          </button>
        </form>
      </Section>

      {/* Password */}
      <Section title={hasPassword ? "Change Password" : "Set Password"}>
        {!hasPassword && (
          <p className="text-sm" style={{ color: "#8a8070" }}>
            Your account uses Battle.net login. You can set a password to also sign in with email.
          </p>
        )}
        <form onSubmit={changePassword} className="space-y-3">
          {hasPassword && (
            <div>
              <label style={labelStyle}>Current Password</label>
              <input type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                style={inputStyle} placeholder="Current password" required={hasPassword} />
            </div>
          )}
          <div>
            <label style={labelStyle}>New Password</label>
            <input type="password" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
              style={inputStyle} placeholder="Min 8 characters" required />
          </div>
          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              style={inputStyle} placeholder="Repeat new password" required />
          </div>
          {pwMsg && <Toast msg={pwMsg.text} ok={pwMsg.ok} />}
          <button type="submit" disabled={pwLoading} className="wow-btn text-sm">
            {pwLoading ? "Saving…" : hasPassword ? "Change Password" : "Set Password"}
          </button>
        </form>
      </Section>

      {/* Email */}
      {user.email && (
        <Section title="Email">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: "#e8dfc8" }}>{user.email}</p>
            <span className="text-xs" style={{ color: "#5a5040" }}>Cannot be changed</span>
          </div>
        </Section>
      )}
    </div>
  );
}
