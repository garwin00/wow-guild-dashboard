"use client";

import { useState } from "react";

type CharRole = "TANK" | "HEALER" | "DPS";
interface Character { id: string; name: string; realm: string; class: string; spec: string | null; role: CharRole; itemLevel: number | null; isMain: boolean; }

const CLASS_COLORS: Record<string, string> = {
  "Death Knight": "text-red-400", "Demon Hunter": "text-purple-400",
  "Druid": "text-orange-400", "Evoker": "text-teal-400",
  "Hunter": "text-green-400", "Mage": "text-blue-300",
  "Monk": "text-emerald-400", "Paladin": "text-yellow-300",
  "Priest": "text-gray-100", "Rogue": "text-yellow-500",
  "Shaman": "text-blue-500", "Warlock": "text-violet-400",
  "Warrior": "text-orange-600",
};

const ROLE_ICON: Record<CharRole, string> = { TANK: "🛡️", HEALER: "💚", DPS: "⚔️" };

export default function RosterClient({ characters, guildSlug, isOfficer, guildName }: {
  characters: Character[]; guildSlug: string; isOfficer: boolean; guildName: string;
}) {
  const [chars, setChars] = useState(characters);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [filter, setFilter] = useState<CharRole | "ALL">("ALL");

  async function syncRoster() {
    setSyncing(true); setSyncMsg("");
    const res = await fetch("/api/roster/sync", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guildSlug }),
    });
    const data = await res.json();
    setSyncMsg(res.ok ? `✓ Synced ${data.synced} characters` : `Error: ${data.error}`);
    setSyncing(false);
    if (res.ok) window.location.reload();
  }

  async function setRole(characterId: string, role: CharRole) {
    await fetch("/api/roster/role", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId, role, guildSlug }),
    });
    setChars((prev) => prev.map((c) => c.id === characterId ? { ...c, role } : c));
  }

  const displayed = filter === "ALL" ? chars : chars.filter((c) => c.role === filter);
  const counts = { TANK: chars.filter(c => c.role === "TANK").length, HEALER: chars.filter(c => c.role === "HEALER").length, DPS: chars.filter(c => c.role === "DPS").length };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Roster</h1>
          <p className="text-gray-400 text-sm mt-1">{chars.length} characters · {guildName}</p>
        </div>
        {isOfficer && (
          <div className="flex items-center gap-3">
            {syncMsg && <span className="text-sm text-gray-400">{syncMsg}</span>}
            <button onClick={syncRoster} disabled={syncing}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {syncing ? "Syncing…" : "↻ Sync from Blizzard"}
            </button>
          </div>
        )}
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(["TANK", "HEALER", "DPS"] as CharRole[]).map((r) => (
          <button key={r} onClick={() => setFilter(filter === r ? "ALL" : r)}
            className={`rounded-xl p-4 border text-left transition-colors ${filter === r ? "bg-gray-700 border-gray-500" : "bg-gray-900 border-gray-800 hover:bg-gray-800"}`}>
            <span className="text-xl">{ROLE_ICON[r]}</span>
            <p className="text-white font-semibold mt-1">{counts[r]}</p>
            <p className="text-gray-400 text-xs capitalize">{r.toLowerCase()}s</p>
          </button>
        ))}
      </div>

      {/* Character table */}
      {displayed.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No characters found.{isOfficer && " Click \"Sync from Blizzard\" to import your guild roster."}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Character</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">iLvl</th>
                <th className="px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((char) => (
                <tr key={char.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{char.name}</p>
                    <p className="text-gray-500 text-xs">{char.realm}</p>
                  </td>
                  <td className={`px-4 py-3 text-sm font-medium ${CLASS_COLORS[char.class] ?? "text-gray-300"}`}>
                    {char.spec ? `${char.spec} ` : ""}{char.class}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">
                    {char.itemLevel ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {isOfficer ? (
                      <select value={char.role} onChange={(e) => setRole(char.id, e.target.value as CharRole)}
                        className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-500">
                        <option value="TANK">🛡️ Tank</option>
                        <option value="HEALER">💚 Healer</option>
                        <option value="DPS">⚔️ DPS</option>
                      </select>
                    ) : (
                      <span className="text-sm">{ROLE_ICON[char.role]} {char.role}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
