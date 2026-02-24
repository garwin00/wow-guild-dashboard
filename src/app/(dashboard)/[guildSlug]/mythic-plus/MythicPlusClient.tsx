"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { scoreColor } from "@/lib/raiderio";
import type { RioAffixesResponse } from "@/lib/raiderio";

const CLASS_COLORS: Record<string, string> = {
  "death knight": "#C41E3A",
  "demon hunter": "#A330C9",
  druid: "#FF7C0A",
  evoker: "#33937F",
  hunter: "#AAD372",
  mage: "#3FC7EB",
  monk: "#00FF98",
  paladin: "#F48CBA",
  priest: "#FFFFFF",
  rogue: "#FFF468",
  shaman: "#0070DD",
  warlock: "#8788EE",
  warrior: "#C69B3A",
};

function classColor(cls: string): string {
  return CLASS_COLORS[cls?.toLowerCase()] ?? "#9d9d9d";
}

function ScoreBadge({ score }: { score: number }) {
  const color = scoreColor(score);
  if (score === 0) return <span className="text-zinc-500 text-sm">—</span>;
  return (
    <span className="font-bold text-sm tabular-nums" style={{ color }}>
      {score.toFixed(1)}
    </span>
  );
}

type RoleTab = "all" | "TANK" | "HEALER" | "DPS";

interface MythicRun {
  id: string;
  dungeon: string;
  shortName: string;
  level: number;
  score: number;
  completedAt: Date | string;
  upgrades: number;
  url: string | null;
  affixes: string[];
}

interface CharacterWithScore {
  id: string;
  name: string;
  realm: string;
  class: string;
  spec: string | null;
  role: string;
  mythicScore: { all: number; dps: number; healer: number; tank: number; updatedAt: Date | string } | null;
  mythicRuns: MythicRun[];
}

interface Props {
  characters: CharacterWithScore[];
  affixes: RioAffixesResponse | null;
  guildSlug: string;
  isOfficer: boolean;
  guildName: string;
  guildRegion: string;
}

function timeSince(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function upgradeArrows(n: number): string {
  if (n >= 3) return "⬆⬆⬆";
  if (n === 2) return "⬆⬆";
  if (n === 1) return "⬆";
  return "⏱";
}

export default function MythicPlusClient({
  characters,
  affixes,
  guildSlug,
  isOfficer,
  guildName,
  guildRegion,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [roleTab, setRoleTab] = useState<RoleTab>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/mythic-plus/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildSlug }),
      });
      const data = await res.json();
      if (!res.ok) setSyncResult(`Error: ${data.error}`);
      else setSyncResult(`✓ Synced ${data.synced}/${data.total} characters`);
      startTransition(() => router.refresh());
    } catch (e) {
      setSyncResult("Network error");
    } finally {
      setSyncing(false);
    }
  }

  const filtered = characters
    .filter((c) => roleTab === "all" || c.role === roleTab)
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.mythicScore?.all ?? 0) - (a.mythicScore?.all ?? 0));

  const lastSync = characters
    .map((c) => c.mythicScore?.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  const ROLE_TABS: { key: RoleTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "TANK", label: "⚔ Tank" },
    { key: "HEALER", label: "✚ Healer" },
    { key: "DPS", label: "🗡 DPS" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mythic+ Leaderboard</h1>
          <p className="text-zinc-400 text-sm mt-0.5">{guildName} — Season scores from Raider.IO</p>
        </div>
        {isOfficer && (
          <div className="flex items-center gap-3">
            {lastSync && (
              <span className="text-xs text-zinc-500">Last synced {timeSince(lastSync)}</span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {syncing ? "Syncing…" : "⟳ Sync Scores"}
            </button>
          </div>
        )}
      </div>

      {syncResult && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-300">
          {syncResult}
        </div>
      )}

      {/* Top 3 Podium */}
      {filtered.length >= 1 && filtered[0].mythicScore && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { pos: 1, medal: "🥇", border: "border-yellow-500/40", bg: "bg-yellow-500/5", glow: "shadow-yellow-500/10" },
            { pos: 2, medal: "🥈", border: "border-zinc-400/30", bg: "bg-zinc-400/5", glow: "" },
            { pos: 3, medal: "🥉", border: "border-orange-700/30", bg: "bg-orange-700/5", glow: "" },
          ].map(({ pos, medal, border, bg, glow }) => {
            const char = filtered[pos - 1];
            if (!char) return <div key={pos} />;
            const score = char.mythicScore?.all ?? 0;
            return (
              <div
                key={pos}
                className={`rounded-xl border ${border} ${bg} shadow-lg ${glow} p-4 flex flex-col items-center gap-2 text-center`}
              >
                <span className="text-2xl">{medal}</span>
                <span className="font-bold text-base" style={{ color: classColor(char.class) }}>
                  {char.name}
                </span>
                <span className="text-xs text-zinc-400">
                  {char.spec ? `${char.spec} ` : ""}{char.class}
                </span>
                <span className="text-2xl font-bold tabular-nums mt-1" style={{ color: scoreColor(score) }}>
                  {score > 0 ? score.toFixed(1) : "—"}
                </span>
                {char.mythicRuns[0] && (
                  <span className="text-xs text-zinc-500">Best: +{char.mythicRuns[0].level} {char.mythicRuns[0].shortName}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Current Affixes */}
      {affixes && affixes.affix_details.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            This Week's Affixes
          </p>
          <div className="flex flex-wrap gap-3">
            {affixes.affix_details.map((ad) => (
              <a
                key={ad.id}
                href={ad.wowhead_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2 transition-colors"
                title={ad.description}
              >
                <img
                  src={ad.icon_url}
                  alt={ad.name}
                  className="w-6 h-6 rounded"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
                <span className="text-sm font-medium text-zinc-200">{ad.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border border-zinc-700">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRoleTab(tab.key)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                roleTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search character…"
          className="flex-1 min-w-[180px] max-w-xs bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        <span className="text-xs text-zinc-500">{filtered.length} characters</span>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left py-3 px-4 text-zinc-400 font-medium w-10">#</th>
              <th className="text-left py-3 px-4 text-zinc-400 font-medium">Character</th>
              <th className="text-left py-3 px-4 text-zinc-400 font-medium">Role</th>
              <th className="text-right py-3 px-4 text-zinc-400 font-medium">Score</th>
              <th className="text-right py-3 px-4 text-zinc-400 font-medium">Tank</th>
              <th className="text-right py-3 px-4 text-zinc-400 font-medium">Healer</th>
              <th className="text-right py-3 px-4 text-zinc-400 font-medium">DPS</th>
              <th className="text-right py-3 px-4 text-zinc-400 font-medium">Best Key</th>
              <th className="w-4 px-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-zinc-500">
                  {characters.some((c) => c.mythicScore)
                    ? "No characters match your filter."
                    : isOfficer
                    ? 'No M+ scores yet. Click "Sync Scores" to fetch from Raider.IO.'
                    : "No M+ scores synced yet."}
                </td>
              </tr>
            )}
            {filtered.map((char, i) => {
              const score = char.mythicScore;
              const bestRun = char.mythicRuns[0];
              const isExpanded = expanded === char.id;

              return (
                <>
                  <tr
                    key={char.id}
                    onClick={() => setExpanded(isExpanded ? null : char.id)}
                    className={`border-b border-zinc-800/50 cursor-pointer transition-colors ${
                      isExpanded ? "bg-zinc-800/50" : "hover:bg-zinc-800/30"
                    }`}
                  >
                    <td className="py-3 px-4">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-zinc-500">{i + 1}</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-1.5 h-8 rounded-full flex-shrink-0"
                          style={{ backgroundColor: classColor(char.class) }}
                        />
                        <div>
                          <span
                            className="font-semibold"
                            style={{ color: classColor(char.class) }}
                          >
                            {char.name}
                          </span>
                          <div className="text-xs text-zinc-500">
                            {char.spec ? `${char.spec} ` : ""}{char.class}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-zinc-400">{char.role}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ScoreBadge score={score?.all ?? 0} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ScoreBadge score={score?.tank ?? 0} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ScoreBadge score={score?.healer ?? 0} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ScoreBadge score={score?.dps ?? 0} />
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-300 font-medium">
                      {bestRun ? `+${bestRun.level}` : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-2 text-zinc-600">
                      {char.mythicRuns.length > 0 ? (isExpanded ? "▲" : "▼") : ""}
                    </td>
                  </tr>

                  {isExpanded && char.mythicRuns.length > 0 && (
                    <tr key={`${char.id}-runs`} className="bg-zinc-800/20">
                      <td colSpan={9} className="px-6 py-4">
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                          Best Runs
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                          {char.mythicRuns.map((run) => (
                            <a
                              key={run.id}
                              href={run.url ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="bg-zinc-800 hover:bg-zinc-700 rounded-lg p-3 transition-colors block"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-zinc-200">{run.shortName}</span>
                                <span className="text-xs font-bold text-blue-400">+{run.level}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span
                                  className="text-sm font-bold"
                                  style={{ color: scoreColor(run.score) }}
                                >
                                  {run.score.toFixed(1)}
                                </span>
                                <span className="text-xs text-zinc-400" title={run.upgrades > 0 ? "Timed" : "Overtime"}>
                                  {upgradeArrows(run.upgrades)}
                                </span>
                              </div>
                              {run.affixes.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {run.affixes.slice(0, 3).map((a) => (
                                    <span key={a} className="text-[10px] text-zinc-500">{a.slice(0, 8)}</span>
                                  ))}
                                </div>
                              )}
                            </a>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Attribution */}
      <p className="text-xs text-zinc-600 text-right">
        M+ data provided by{" "}
        <a
          href="https://raider.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 hover:text-zinc-300 underline"
        >
          Raider.IO
        </a>
      </p>
    </div>
  );
}
