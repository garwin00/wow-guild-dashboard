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
      <h1 className="text-3xl font-bold text-white">Settings</h1>

      {/* Guild info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-3">Guild</h2>
        <div className="text-gray-400 text-sm space-y-1">
          <p><span className="text-gray-500">Name:</span> {guild.name}</p>
          <p><span className="text-gray-500">Realm:</span> {guild.realm}</p>
          <p><span className="text-gray-500">Region:</span> {guild.region.toUpperCase()}</p>
        </div>
      </div>

      {/* Warcraft Logs */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-white font-semibold">Warcraft Logs</h2>
          {guild.wclGuildId && (
            <span className="text-xs bg-green-900/40 text-green-400 border border-green-800 rounded-full px-2 py-0.5">Connected</span>
          )}
        </div>

        {/* Step-by-step instructions */}
        <div className="mb-4 space-y-2 text-sm text-gray-400">
          <p>To link your guild, find your guild name on Warcraft Logs:</p>
          <ol className="list-decimal list-inside space-y-1.5 text-gray-400 ml-1">
            <li>
              Go to{" "}
              <a href={`https://www.warcraftlogs.com/guild/eu/${guild.realm.toLowerCase().replace(/\s+/g, "-")}/${guild.name.toLowerCase().replace(/\s+/g, "-")}`}
                target="_blank" rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                your guild&apos;s WCL page ↗
              </a>{" "}
              (auto-linked for {guild.name}–{guild.realm})
            </li>
            <li>
              The URL will look like{" "}
              <code className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                warcraftlogs.com/guild/<span className="text-purple-300">eu</span>/<span className="text-purple-300">kazzak</span>/<span className="text-purple-300">your-guild-name</span>
              </code>
            </li>
            <li>
              Enter <strong className="text-gray-200">exactly the guild name</strong> as it appears in that URL (lowercase, hyphens for spaces) in the field below
            </li>
          </ol>
          <p className="text-gray-500 text-xs mt-2">
            This is used to fetch reports and enable live log tracking. You also need{" "}
            <code className="bg-gray-800 px-1 rounded">WCL_CLIENT_ID</code> and{" "}
            <code className="bg-gray-800 px-1 rounded">WCL_CLIENT_SECRET</code> set in your <code className="bg-gray-800 px-1 rounded">.env.local</code> — get them at{" "}
            <a href="https://www.warcraftlogs.com/api/clients/" target="_blank" rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300">warcraftlogs.com/api/clients ↗</a>.
          </p>
        </div>

        <form onSubmit={saveWcl} className="flex gap-3">
          <input value={wclId} onChange={(e) => setWclId(e.target.value)}
            placeholder={`e.g. ${guild.name.toLowerCase().replace(/\s+/g, "-")}`}
            className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 font-mono" />
          <button type="submit" disabled={saving} className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
        {guild.wclGuildId && (
          <p className="text-gray-500 text-xs mt-2">
            Currently linked to: <code className="text-purple-400">{guild.wclGuildId}</code>
          </p>
        )}
        {message && <p className="text-xs text-green-400 mt-2">{message}</p>}
      </div>

      {/* Member roles */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Member Roles</h2>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">{m.user.battletag ?? m.user.name ?? "Unknown"}</span>
              {isGm && m.role !== "GM" ? (
                <select value={m.role} onChange={(e) => updateRole(m.id, e.target.value as GuildRole)}
                  className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1 focus:outline-none">
                  {ROLES.filter((r) => r !== "GM").map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <span className={`text-xs border rounded-full px-2 py-0.5 ${ROLE_BADGE[m.role]}`}>{m.role}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
