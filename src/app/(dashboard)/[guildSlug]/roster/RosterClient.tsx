"use client";

import { useState } from "react";

type CharRole = "TANK" | "HEALER" | "DPS";
interface Character {
  id: string; name: string; realm: string; class: string; spec: string | null;
  role: CharRole; itemLevel: number | null; isMain: boolean; avatarUrl: string | null;
  guildRank: number | null;
}

const CLASS_COLORS: Record<string, string> = {
  "Death Knight": "text-red-400",
  "Demon Hunter": "text-purple-400",
  "Druid": "text-orange-400",
  "Evoker": "text-teal-400",
  "Hunter": "text-green-400",
  "Mage": "text-blue-300",
  "Monk": "text-emerald-400",
  "Paladin": "text-yellow-300",
  "Priest": "text-gray-100",
  "Rogue": "text-yellow-500",
  "Shaman": "text-blue-500",
  "Warlock": "text-violet-400",
  "Warrior": "text-orange-600",
};

const CLASS_BG: Record<string, string> = {
  "Death Knight": "bg-red-950",
  "Demon Hunter": "bg-purple-950",
  "Druid": "bg-orange-950",
  "Evoker": "bg-teal-950",
  "Hunter": "bg-green-950",
  "Mage": "bg-blue-950",
  "Monk": "bg-emerald-950",
  "Paladin": "bg-yellow-950",
  "Priest": "bg-gray-900",
  "Rogue": "bg-yellow-950",
  "Shaman": "bg-blue-950",
  "Warlock": "bg-violet-950",
  "Warrior": "bg-orange-950",
};

const ROLE_ICON: Record<CharRole, string> = { TANK: "🛡️", HEALER: "💚", DPS: "⚔️" };
const ROLE_LABEL: Record<CharRole, string> = { TANK: "Tanks", HEALER: "Healers", DPS: "DPS" };

// Midnight-era squished item levels (100–300 range)
// ~Raid Finder ≈ 160, Normal ≈ 180, Heroic ≈ 200, Mythic ≈ 220+
function iLvlColor(ilvl: number | null): string {
  if (!ilvl) return "text-gray-500";
  if (ilvl >= 220) return "text-orange-400"; // Mythic / BiS
  if (ilvl >= 200) return "text-purple-400"; // Heroic
  if (ilvl >= 180) return "text-blue-400";   // Normal
  if (ilvl >= 160) return "text-green-400";  // Raid Finder / world gear
  return "text-gray-400";
}

export default function RosterClient({ characters, guildSlug, isOfficer, guildName }: {
  characters: Character[]; guildSlug: string; isOfficer: boolean; guildName: string;
}) {
  const [chars, setChars] = useState(characters);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [filter, setFilter] = useState<CharRole | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"rank" | "ilvl" | "name">("rank");

  async function syncRoster() {
    setSyncing(true); setSyncMsg("Syncing roster + fetching specs…");
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

  const filtered = chars
    .filter((c) => filter === "ALL" || c.role === filter)
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.class.toLowerCase().includes(search.toLowerCase()) || (c.spec ?? "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "rank") return (a.guildRank ?? 99) - (b.guildRank ?? 99) || a.name.localeCompare(b.name);
      if (sortBy === "ilvl") return (b.itemLevel ?? 0) - (a.itemLevel ?? 0);
      return a.name.localeCompare(b.name);
    });

  const counts = {
    TANK: chars.filter(c => c.role === "TANK").length,
    HEALER: chars.filter(c => c.role === "HEALER").length,
    DPS: chars.filter(c => c.role === "DPS").length,
  };

  const avgIlvl = chars.filter(c => c.itemLevel).length > 0
    ? Math.round(chars.filter(c => c.itemLevel).reduce((s, c) => s + (c.itemLevel ?? 0), 0) / chars.filter(c => c.itemLevel).length)
    : null;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Roster</h1>
          <p className="text-gray-400 text-sm mt-1">
            {chars.length} characters · {guildName}
            {avgIlvl && <span className={`ml-2 font-medium ${iLvlColor(avgIlvl)}`}>avg {avgIlvl} iLvl</span>}
          </p>
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

      {/* Role summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {(["TANK", "HEALER", "DPS"] as CharRole[]).map((r) => (
          <button key={r} onClick={() => setFilter(filter === r ? "ALL" : r)}
            className={`rounded-xl p-4 border text-left transition-colors ${filter === r ? "bg-gray-700 border-gray-500" : "bg-gray-900 border-gray-800 hover:bg-gray-800"}`}>
            <span className="text-xl">{ROLE_ICON[r]}</span>
            <p className="text-white font-bold text-xl mt-1">{counts[r]}</p>
            <p className="text-gray-400 text-xs">{ROLE_LABEL[r]}</p>
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, class or spec…"
          className="w-full max-w-xs bg-gray-900 border border-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600" />
        <div className="flex gap-1 ml-auto">
          {(["rank", "ilvl", "name"] as const).map((s) => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sortBy === s ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"}`}>
              {s === "rank" ? "Guild Rank" : s === "ilvl" ? "iLvl ↓" : "Name"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          {chars.length === 0
            ? isOfficer ? 'Click "Sync from Blizzard" to import your guild roster.' : "No roster data yet."
            : "No characters match your search."}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 w-10 text-center">Rank</th>
                <th className="px-4 py-3">Character</th>
                <th className="px-4 py-3">Class · Spec</th>
                <th className="px-4 py-3 text-right">iLvl</th>
                <th className="px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((char) => (
                <tr key={char.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-center text-xs text-gray-500 tabular-nums">
                    {char.guildRank ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {char.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={char.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-700" />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${CLASS_BG[char.class] ?? "bg-gray-800"} ${CLASS_COLORS[char.class] ?? "text-gray-300"}`}>
                          {char.name[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium text-sm">{char.name}</p>
                        <p className="text-gray-500 text-xs">{char.realm.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${CLASS_COLORS[char.class] ?? "text-gray-300"}`}>
                      {char.spec ? `${char.spec} ` : ""}{char.class !== "Unknown" ? char.class : <span className="text-gray-600 italic">Unknown</span>}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-sm font-semibold text-right tabular-nums ${iLvlColor(char.itemLevel)}`}>
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
                      <span className="text-sm text-gray-300">{ROLE_ICON[char.role]} {char.role}</span>
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
