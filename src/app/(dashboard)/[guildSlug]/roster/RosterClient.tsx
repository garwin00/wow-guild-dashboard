"use client";

import { useState } from "react";

type CharRole = "TANK" | "HEALER" | "DPS";
interface Character {
  id: string; name: string; realm: string; class: string; spec: string | null;
  role: CharRole; itemLevel: number | null; isMain: boolean; avatarUrl: string | null;
  guildRank: number | null;
}

// Official Blizzard WoW class colours
const CLASS_COLOR_HEX: Record<string, string> = {
  "death knight": "#C41E3A",
  "demon hunter": "#A330C9",
  "druid":        "#FF7C0A",
  "evoker":       "#33937F",
  "hunter":       "#AAD372",
  "mage":         "#3FC7EB",
  "monk":         "#00FF98",
  "paladin":      "#F48CBA",
  "priest":       "#FFFFFF",
  "rogue":        "#FFF468",
  "shaman":       "#0070DD",
  "warlock":      "#8788EE",
  "warrior":      "#C69B3A",
};

function classColor(cls: string): string {
  return CLASS_COLOR_HEX[cls.toLowerCase()] ?? "#9ca3af";
}

// 15% opacity version of the class colour for avatar backgrounds
function classColorBg(cls: string): string {
  const hex = CLASS_COLOR_HEX[cls.toLowerCase()];
  if (!hex) return "rgba(156,163,175,0.15)";
  // Convert #RRGGBB → rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.15)`;
}

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
  const [cooldownUntil, setCooldownUntil] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem(`roster-sync-cooldown-${guildSlug}`) ?? "0", 10);
  });

  const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
  const cooldownRemaining = Math.max(0, cooldownUntil - Date.now());
  const cooldownMins = Math.ceil(cooldownRemaining / 60000);
  const onCooldown = cooldownRemaining > 0;

  async function syncRoster() {
    if (onCooldown) return;
    setSyncing(true); setSyncMsg("Syncing roster + fetching specs…");
    const res = await fetch("/api/roster/sync", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guildSlug }),
    });
    const data = await res.json();
    setSyncMsg(res.ok ? `✓ Synced ${data.synced} characters` : `Error: ${data.error}`);
    setSyncing(false);
    if (res.ok) {
      const until = Date.now() + COOLDOWN_MS;
      localStorage.setItem(`roster-sync-cooldown-${guildSlug}`, String(until));
      setCooldownUntil(until);
      window.location.reload();
    }
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
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl wow-heading" style={{ color: "#f0c040" }}>Roster</h1>
          <p className="text-sm mt-1" style={{ color: "#8a8070" }}>
            {chars.length} characters · {guildName}
            {avgIlvl && <span className={`ml-2 font-medium ${iLvlColor(avgIlvl)}`}>avg {avgIlvl} iLvl</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {syncMsg && <span className="text-sm" style={{ color: "#8a8070" }}>{syncMsg}</span>}
          <button onClick={syncRoster} disabled={syncing || onCooldown}
            className="wow-btn"
            title={onCooldown ? `Available in ${cooldownMins}m` : "Sync roster from Blizzard"}>
            {syncing ? "Syncing…" : onCooldown ? `↻ Sync (${cooldownMins}m)` : "↻ Sync Roster"}
          </button>
        </div>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {(["TANK", "HEALER", "DPS"] as CharRole[]).map((r) => (
          <button key={r} onClick={() => setFilter(filter === r ? "ALL" : r)}
            className="rounded-lg p-4 text-left transition-all"
            style={{
              background: filter === r ? "rgba(200,169,106,0.12)" : "#0f1019",
              border: filter === r ? "1px solid rgba(200,169,106,0.5)" : "1px solid rgba(200,169,106,0.15)",
            }}>
            <span className="text-xl">{ROLE_ICON[r]}</span>
            <p className="font-bold text-xl mt-1" style={{ color: "#e8dfc8" }}>{counts[r]}</p>
            <p className="text-xs" style={{ color: "#8a8070" }}>{ROLE_LABEL[r]}</p>
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, class or spec…"
          className="w-full max-w-xs rounded px-3 py-2 text-sm focus:outline-none"
          style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)", color: "#e8dfc8" }} />
        <div className="flex gap-1 ml-auto">
          {(["rank", "ilvl", "name"] as const).map((s) => (
            <button key={s} onClick={() => setSortBy(s)}
              className="px-3 py-1.5 rounded text-xs transition-all"
              style={{
                fontFamily: "var(--font-cinzel), serif",
                letterSpacing: "0.04em",
                background: sortBy === s ? "rgba(200,169,106,0.15)" : "transparent",
                color: sortBy === s ? "#f0c040" : "#5a5040",
                border: sortBy === s ? "1px solid rgba(200,169,106,0.3)" : "1px solid transparent",
              }}>
              {s === "rank" ? "Rank" : s === "ilvl" ? "iLvl" : "Name"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: "#5a5040" }}>
          {chars.length === 0
            ? isOfficer ? 'Click "Sync Roster" to import your guild.' : "No roster data yet."
            : "No characters match your search."}
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.15)" }}>
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest" style={{ borderBottom: "1px solid rgba(200,169,106,0.15)", fontFamily: "var(--font-cinzel), serif", color: "#5a5040" }}>
                <th className="px-4 py-3 w-10 text-center hidden sm:table-cell">Rank</th>
                <th className="px-4 py-3">Character</th>
                <th className="px-4 py-3 hidden md:table-cell">Class · Spec</th>
                <th className="px-4 py-3 text-right pr-8 hidden sm:table-cell">iLvl</th>
                <th className="px-4 py-3 pl-8">Role</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((char) => (
                <tr key={char.id} className="transition-colors"
                  style={{ borderBottom: "1px solid rgba(200,169,106,0.07)" }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(200,169,106,0.04)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td className="px-4 py-3 text-center text-xs tabular-nums hidden sm:table-cell" style={{ color: "#5a5040" }}>
                    {char.guildRank ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {char.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={char.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" style={{ boxShadow: `0 0 0 1px ${classColor(char.class)}40` }} />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: classColorBg(char.class), color: classColor(char.class) }}>
                          {char.name[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm" style={{ color: "#e8dfc8" }}>{char.name}</p>
                        <p className="text-xs md:hidden" style={{ color: classColor(char.class) }}>
                          {char.spec ? `${char.spec} ` : ""}{char.class}
                        </p>
                        <p className="text-xs hidden md:block" style={{ color: "#5a5040" }}>{char.realm.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm font-medium" style={{ color: classColor(char.class) }}>
                      {char.spec ? `${char.spec} ` : ""}{char.class && char.class !== "Unknown" ? char.class : <span className="italic" style={{ color: "#5a5040" }}>Unknown</span>}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-sm font-semibold text-right pr-8 tabular-nums hidden sm:table-cell ${iLvlColor(char.itemLevel)}`}>
                    {char.itemLevel ?? "—"}
                  </td>
                  <td className="px-4 py-3 pl-4 sm:pl-8">
                    {isOfficer ? (
                      <select value={char.role} onChange={(e) => setRole(char.id, e.target.value as CharRole)}
                        className="text-xs rounded px-2 py-1 focus:outline-none"
                        style={{ background: "#161722", border: "1px solid rgba(200,169,106,0.2)", color: "#e8dfc8" }}>
                        <option value="TANK">🛡️ Tank</option>
                        <option value="HEALER">💚 Healer</option>
                        <option value="DPS">⚔️ DPS</option>
                      </select>
                    ) : (
                      <span className="text-sm">{ROLE_ICON[char.role]}</span>
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
