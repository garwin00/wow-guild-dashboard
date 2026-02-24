"use client";

import { useState } from "react";

type GuildRole = "GM" | "OFFICER" | "MEMBER" | "TRIALIST";
interface Guild { id: string; name: string; realm: string; region: string; wclGuildId: string | null; }
interface Member { id: string; role: GuildRole; user: { id: string; battletag: string | null; name: string | null; }; }

const ROLES: GuildRole[] = ["GM", "OFFICER", "MEMBER", "TRIALIST"];
const ROLE_BADGE: Record<GuildRole, string> = {
  GM: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  OFFICER: "bg-blue-900/50 text-blue-300 border-blue-700",
  MEMBER: "bg-gray-800 text-gray-300 border-gray-700",
  TRIALIST: "bg-gray-800/50 text-gray-500 border-gray-800",
};

export default function SettingsClient({ guild, members: initial, isGm }: {
  guild: Guild; members: Member[]; isGm: boolean;
}) {
  const [members, setMembers] = useState(initial);
  const [wclId, setWclId] = useState(guild.wclGuildId ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveWcl(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMessage("");
    const res = await fetch("/api/settings/wcl", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guildId: guild.id, wclGuildId: wclId }),
    });
    setMessage(res.ok ? "Saved!" : "Failed to save.");
    setSaving(false);
  }

  async function updateRole(memberId: string, role: GuildRole) {
    const res = await fetch("/api/settings/role", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId: memberId, role, guildId: guild.id }),
    });
    if (res.ok) setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m));
  }

  return (
    <div className="p-8 max-w-2xl space-y-8">
      <h1 className="wow-heading text-3xl font-bold" style={{ color: "#f0c040" }}>Settings</h1>

      {/* Guild info */}
      <div style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.15)", borderRadius: "0.5rem", padding: "1.25rem" }}>
        <h2 style={{ color: "#e8dfc8", fontWeight: 600, marginBottom: "0.75rem" }}>Guild</h2>
        <div style={{ color: "#8a8070", fontSize: "0.875rem" }} className="space-y-1">
          <p><span style={{ color: "#5a5040" }}>Name:</span> {guild.name}</p>
          <p><span style={{ color: "#5a5040" }}>Realm:</span> {guild.realm}</p>
          <p><span style={{ color: "#5a5040" }}>Region:</span> {guild.region.toUpperCase()}</p>
        </div>
      </div>

      {/* Warcraft Logs */}
      <div style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.15)", borderRadius: "0.5rem", padding: "1.25rem" }}>
        <div className="flex items-center gap-2 mb-1">
          <h2 style={{ color: "#e8dfc8", fontWeight: 600 }}>Warcraft Logs</h2>
          {guild.wclGuildId && (
            <span style={{ fontSize: "0.75rem", background: "rgba(64,200,100,0.12)", color: "#40c864", border: "1px solid rgba(64,200,100,0.4)", borderRadius: "9999px", padding: "0.125rem 0.5rem" }}>Connected</span>
          )}
        </div>

        {/* Step-by-step instructions */}
        <div className="mb-4 space-y-2" style={{ fontSize: "0.875rem", color: "#8a8070" }}>
          <p>To link your guild, find your guild name on Warcraft Logs:</p>
          <ol className="list-decimal list-inside space-y-1.5 ml-1" style={{ color: "#8a8070" }}>
            <li>
              Go to{" "}
              <a href={`https://www.warcraftlogs.com/guild/eu/${guild.realm.toLowerCase().replace(/\s+/g, "-")}/${guild.name.toLowerCase().replace(/\s+/g, "-")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ color: "#c8a96a", textDecoration: "underline", textUnderlineOffset: "0.125rem" }}>
                your guild&apos;s WCL page ↗
              </a>{" "}
              (auto-linked for {guild.name}–{guild.realm})
            </li>
            <li>
              The URL will look like{" "}
              <code style={{ color: "#e8dfc8", background: "#09090e", border: "1px solid rgba(200,169,106,0.15)", padding: "0.125rem 0.375rem", borderRadius: "0.25rem", fontSize: "0.75rem" }}>
                warcraftlogs.com/guild/<span style={{ color: "#c8a96a" }}>eu</span>/<span style={{ color: "#c8a96a" }}>kazzak</span>/<span style={{ color: "#c8a96a" }}>your-guild-name</span>
              </code>
            </li>
            <li>
              Enter <strong style={{ color: "#e8dfc8" }}>exactly the guild name</strong> as it appears in that URL (lowercase, hyphens for spaces) in the field below
            </li>
          </ol>
          <p style={{ color: "#5a5040", fontSize: "0.75rem", marginTop: "0.5rem" }}>
            This is used to fetch reports and enable live log tracking. You also need{" "}
            <code style={{ background: "#09090e", border: "1px solid rgba(200,169,106,0.15)", padding: "0 0.25rem", borderRadius: "0.25rem", color: "#c8a96a" }}>WCL_CLIENT_ID</code> and{" "}
            <code style={{ background: "#09090e", border: "1px solid rgba(200,169,106,0.15)", padding: "0 0.25rem", borderRadius: "0.25rem", color: "#c8a96a" }}>WCL_CLIENT_SECRET</code> set in your <code style={{ background: "#09090e", border: "1px solid rgba(200,169,106,0.15)", padding: "0 0.25rem", borderRadius: "0.25rem", color: "#c8a96a" }}>.env.local</code> — get them at{" "}
            <a href="https://www.warcraftlogs.com/api/clients/" target="_blank" rel="noopener noreferrer"
              style={{ color: "#c8a96a" }}>warcraftlogs.com/api/clients ↗</a>.
          </p>
        </div>

        <form onSubmit={saveWcl} className="flex gap-3">
          <input value={wclId} onChange={(e) => setWclId(e.target.value)}
            placeholder={`e.g. ${guild.name.toLowerCase().replace(/\s+/g, "-")}`}
            style={{ flex: 1, background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)", color: "#e8dfc8", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none", fontFamily: "monospace" }} />
          <button type="submit" disabled={saving} className="wow-btn" style={{ opacity: saving ? 0.5 : 1 }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
        {guild.wclGuildId && (
          <p style={{ color: "#5a5040", fontSize: "0.75rem", marginTop: "0.5rem" }}>
            Currently linked to: <code style={{ color: "#c8a96a" }}>{guild.wclGuildId}</code>
          </p>
        )}
        {message && <p style={{ fontSize: "0.75rem", color: "#40c864", marginTop: "0.5rem" }}>{message}</p>}
      </div>

      {/* Member roles */}
      <div style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.15)", borderRadius: "0.5rem", padding: "1.25rem" }}>
        <h2 style={{ color: "#e8dfc8", fontWeight: 600, marginBottom: "1rem" }}>Member Roles</h2>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between">
              <span style={{ color: "#e8dfc8", fontSize: "0.875rem" }}>{m.user.battletag ?? m.user.name ?? "Unknown"}</span>
              {isGm && m.role !== "GM" ? (
                <select value={m.role} onChange={(e) => updateRole(m.id, e.target.value as GuildRole)}
                  style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)", color: "#e8dfc8", fontSize: "0.75rem", borderRadius: "0.25rem", padding: "0.25rem 0.5rem", outline: "none" }}>
                  {ROLES.filter((r) => r !== "GM").map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <span className="text-xs rounded-full px-2 py-0.5"
                  style={m.role === "GM"
                    ? { background: "rgba(240,192,64,0.12)", border: "1px solid rgba(240,192,64,0.4)", color: "#f0c040" }
                    : m.role === "OFFICER"
                    ? { background: "rgba(200,169,106,0.12)", border: "1px solid rgba(200,169,106,0.4)", color: "#c8a96a" }
                    : { background: "rgba(200,169,106,0.06)", border: "1px solid rgba(200,169,106,0.15)", color: "#5a5040" }}>
                  {m.role}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
