"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

function classColorBg(cls: string): string {
  const hex = CLASS_COLORS[cls?.toLowerCase()];
  if (!hex) return "rgba(156,163,175,0.15)";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.15)`;
}

function ScoreBadge({ score }: { score: number }) {
  const color = scoreColor(score);
  if (score === 0) return <span style={{ color: "var(--wow-text-faint)" }}>—</span>;
  return (
    <span className="font-bold tabular-nums" style={{ color }}>
      {score.toFixed(0)}
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
  avatarUrl: string | null;
  mythicScore: { all: number; dps: number; healer: number; tank: number; updatedAt: Date | string } | null;
  mythicRuns: MythicRun[];
}

interface Props {
  guildSlug: string;
  isOfficer: boolean;
  guildName: string;
  guildRegion: string;
}

interface Analytics {
  topKeysThisWeek: { dungeon: string; level: number; character: string; characterClass: string; score: number; upgrades: number; completedAt: string }[];
  groupRuns: { dungeon: string; level: number; members: { name: string; class: string }[]; completedAt: string }[];
  scoreDistribution: { label: string; count: number }[];
  mostActive: { name: string; runs: number; class: string; score: number }[];
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

export default function MythicPlusClient({ guildSlug, isOfficer, guildName, guildRegion }: Props) {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [roleTab, setRoleTab] = useState<RoleTab>("all");
  const [mainTab, setMainTab] = useState<"leaderboard" | "analytics">("leaderboard");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ characters: CharacterWithScore[]; affixes: RioAffixesResponse | null; analytics?: Analytics }>({
    queryKey: ["mythic-plus", guildSlug, mainTab],
    queryFn: () => fetch(`/api/guild/${guildSlug}/mythic-plus${mainTab === "analytics" ? "?analytics=true" : ""}`).then((r) => r.json()),
  });

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/mythic-plus/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildSlug }),
      });
      const d = await res.json();
      if (!res.ok) setSyncResult(`Error: ${d.error}`);
      else setSyncResult(`✓ Synced ${d.synced}/${d.total} characters`);
      queryClient.invalidateQueries({ queryKey: ["mythic-plus", guildSlug] });
    } catch {
      setSyncResult("Network error");
    } finally {
      setSyncing(false);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-sm" style={{ color: "var(--wow-text-faint)" }}>Loading…</span>
      </div>
    );
  }

  const { characters, affixes } = data;

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl wow-heading" style={{ color: "var(--wow-gold-bright)" }}>Mythic+ Leaderboard</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--wow-text-muted)" }}>{guildName} — Season scores from Raider.IO</p>
        </div>
        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>Last synced {timeSince(lastSync)}</span>
          )}
          <button onClick={handleSync} disabled={syncing} className="wow-btn">
            {syncing ? "Syncing…" : "⟳ Sync Scores"}
          </button>
        </div>
      </div>

      {syncResult && (
        <div className="rounded px-4 py-2 text-sm" style={{ background: "rgba(var(--wow-primary-rgb),0.08)", border: "1px solid rgba(var(--wow-primary-rgb),0.25)", color: "var(--wow-text)" }}>
          {syncResult}
        </div>
      )}

      {syncResult && (
        <div className="rounded px-4 py-2 text-sm" style={{ background: "rgba(var(--wow-primary-rgb),0.08)", border: "1px solid rgba(var(--wow-primary-rgb),0.25)", color: "var(--wow-text)" }}>
          {syncResult}
        </div>
      )}

      {/* Main tabs */}
      <div className="flex gap-1">
        <button onClick={() => setMainTab("leaderboard")} className={`wow-tab${mainTab === "leaderboard" ? " wow-tab-active" : ""}`}>Leaderboard</button>
        <button onClick={() => setMainTab("analytics")} className={`wow-tab${mainTab === "analytics" ? " wow-tab-active" : ""}`}>Analytics</button>
      </div>

      {/* Analytics tab */}
      {mainTab === "analytics" && data?.analytics && (() => {
        const { topKeysThisWeek, groupRuns, scoreDistribution, mostActive } = data.analytics;
        const maxBucket = Math.max(...scoreDistribution.map(b => b.count), 1);
        return (
          <div className="space-y-6">
            {/* Top keys */}
            <div className="rounded-lg p-5 space-y-3" style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
              <h2 className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--wow-gold)" }}>Top Keys This Week</h2>
              {topKeysThisWeek.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--wow-text-faint)" }}>No runs recorded this week.</p>
              ) : topKeysThisWeek.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-medium" style={{ color: "var(--wow-text)" }}>{r.dungeon}</span>
                  <span className="font-bold tabular-nums" style={{ color: "var(--wow-gold)" }}>+{r.level}</span>
                  <span style={{ color: classColor(r.characterClass) }}>{r.character}</span>
                  <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>{upgradeArrows(r.upgrades)}</span>
                </div>
              ))}
            </div>

            {/* Guild group runs */}
            {groupRuns.length > 0 && (
              <div className="rounded-lg p-5 space-y-3" style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
                <h2 className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--wow-gold)" }}>Guild Group Runs</h2>
                {groupRuns.map((g, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium" style={{ color: "var(--wow-text)" }}>{g.dungeon} +{g.level} — </span>
                    {g.members.map((m, j) => (
                      <span key={j} style={{ color: classColor(m.class) }}>{m.name}{j < g.members.length - 1 ? ", " : ""}</span>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Score distribution */}
            <div className="rounded-lg p-5 space-y-3" style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
              <h2 className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--wow-gold)" }}>Score Distribution</h2>
              <div className="space-y-2">
                {scoreDistribution.map(b => (
                  <div key={b.label} className="flex items-center gap-3">
                    <span className="text-xs w-20 shrink-0 text-right" style={{ color: "var(--wow-text-faint)" }}>{b.label}</span>
                    <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: "rgba(var(--wow-primary-rgb),0.08)" }}>
                      {b.count > 0 && (
                        <div className="h-full rounded flex items-center pl-2 text-xs font-bold transition-all"
                          style={{ width: `${Math.max(4, (b.count / maxBucket) * 100)}%`, background: "rgba(var(--wow-primary-rgb),0.25)", color: "var(--wow-gold)" }}>
                          {b.count}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Most active */}
            {mostActive.length > 0 && (
              <div className="rounded-lg p-5 space-y-3" style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
                <h2 className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--wow-gold)" }}>Most Active This Week</h2>
                {mostActive.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span style={{ color: classColor(m.class) }}>{m.name}</span>
                    <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>{m.runs} run{m.runs !== 1 ? "s" : ""}</span>
                    <span className="tabular-nums text-xs" style={{ color: "var(--wow-gold)" }}>{m.score > 0 ? m.score.toFixed(1) : "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {mainTab === "analytics" && !data?.analytics && (
        <p className="text-sm py-4" style={{ color: "var(--wow-text-faint)" }}>No analytics data yet — sync scores first.</p>
      )}

      {/* Top 3 Podium */}
      {mainTab === "leaderboard" && filtered.length >= 1 && filtered[0].mythicScore && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { pos: 1, medal: "🥇", borderColor: "rgba(var(--wow-primary-rgb),0.5)", bgColor: "rgba(240,192,64,0.06)" },
            { pos: 2, medal: "🥈", borderColor: "rgba(160,160,160,0.3)", bgColor: "rgba(160,160,160,0.04)" },
            { pos: 3, medal: "🥉", borderColor: "rgba(176,116,78,0.3)", bgColor: "rgba(176,116,78,0.04)" },
          ].map(({ pos, medal, borderColor, bgColor }) => {
            const char = filtered[pos - 1];
            if (!char) return <div key={pos} />;
            const score = char.mythicScore?.all ?? 0;
            return (
              <div key={pos} className="rounded-lg p-4 flex flex-col items-center gap-2 text-center"
                style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
                <span className="text-2xl">{medal}</span>
                <span className="font-bold text-base" style={{ color: classColor(char.class) }}>{char.name}</span>
                <span className="text-xs" style={{ color: "var(--wow-text-muted)" }}>{char.spec ? `${char.spec} ` : ""}{char.class}</span>
                <span className="text-2xl font-bold tabular-nums mt-1" style={{ color: scoreColor(score) }}>
                  {score > 0 ? score.toFixed(0) : "—"}
                </span>
                {char.mythicRuns[0] && (
                  <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>Best: +{char.mythicRuns[0].level} {char.mythicRuns[0].shortName}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Current Affixes */}
      {mainTab === "leaderboard" && affixes && affixes.affix_details.length > 0 && (
        <div className="rounded-lg p-4" style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ fontFamily: "inherit", color: "var(--wow-text-faint)" }}>
            This Week&apos;s Affixes
          </p>
          <div className="flex flex-wrap gap-3">
            {affixes.affix_details.map((ad) => (
              <a key={ad.id} href={ad.wowhead_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded px-3 py-2 transition-all"
                style={{ background: "rgba(var(--wow-primary-rgb),0.06)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}
                title={ad.description}>
                <img src={ad.icon_url} alt={ad.name} className="w-6 h-6 rounded"
                  onError={(e) => (e.currentTarget.style.display = "none")} />
                <span className="text-sm font-medium" style={{ color: "var(--wow-text)" }}>{ad.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {mainTab === "leaderboard" && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex rounded overflow-hidden" style={{ border: "1px solid rgba(var(--wow-primary-rgb),0.2)" }}>
            {ROLE_TABS.map((tab) => (
              <button key={tab.key} onClick={() => setRoleTab(tab.key)}
                className="px-4 py-1.5 text-sm transition-all"
                style={{
                  fontFamily: "inherit",
                  letterSpacing: "0.04em",
                  background: roleTab === tab.key ? "rgba(var(--wow-primary-rgb),0.15)" : "var(--wow-surface)",
                  color: roleTab === tab.key ? "var(--wow-gold-bright)" : "var(--wow-text-faint)",
                  borderRight: "1px solid rgba(var(--wow-primary-rgb),0.15)",
                }}>
                {tab.label}
              </button>
            ))}
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search character…"
            className="flex-1 min-w-[180px] max-w-xs rounded px-3 py-1.5 text-sm focus:outline-none"
            style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)" }} />
          <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>{filtered.length} characters</span>
        </div>
      )}

      {/* Leaderboard Table */}
      {mainTab === "leaderboard" && (
        <div className="rounded-lg overflow-hidden" style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest" style={{ borderBottom: "1px solid rgba(var(--wow-primary-rgb),0.15)", fontFamily: "inherit", color: "var(--wow-text-faint)" }}>
              <th className="py-3 px-4 w-10">#</th>
              <th className="py-3 px-4">Character</th>
              <th className="py-3 px-4 hidden sm:table-cell">Role</th>
              <th className="py-3 px-4 text-right">Score</th>
              <th className="py-3 px-4 text-right hidden md:table-cell">Tank</th>
              <th className="py-3 px-4 text-right hidden md:table-cell">Healer</th>
              <th className="py-3 px-4 text-right hidden md:table-cell">DPS</th>
              <th className="py-3 px-4 text-right hidden sm:table-cell">Best Key</th>
              <th className="w-4 px-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-sm" style={{ color: "var(--wow-text-faint)" }}>
                  {characters.some((c) => c.mythicScore)
                    ? "No characters match your filter."
                    : 'No M+ scores yet. Click "Sync Scores" to fetch from Raider.IO.'}
                </td>
              </tr>
            )}
            {filtered.map((char, i) => {
              const score = char.mythicScore;
              const bestRun = char.mythicRuns[0];
              const isExpanded = expanded === char.id;

              return (
                <>
                  <tr key={char.id} onClick={() => setExpanded(isExpanded ? null : char.id)}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: "1px solid rgba(var(--wow-primary-rgb),0.07)", background: isExpanded ? "rgba(var(--wow-primary-rgb),0.05)" : "transparent" }}
                    onMouseOver={(e) => { if (!isExpanded) e.currentTarget.style.background = "rgba(var(--wow-primary-rgb),0.04)"; }}
                    onMouseOut={(e) => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}>
                    <td className="py-3 px-4">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span style={{ color: "var(--wow-text-faint)" }}>{i + 1}</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {char.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={char.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0"
                            style={{ boxShadow: `0 0 0 1px ${classColor(char.class)}40` }} />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: classColorBg(char.class), color: classColor(char.class) }}>
                            {char.name[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="font-semibold" style={{ color: classColor(char.class) }}>{char.name}</span>
                          <div className="text-xs" style={{ color: "var(--wow-text-muted)" }}>
                            {char.spec ? `${char.spec} ` : ""}{char.class}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="text-sm" style={{ color: "var(--wow-text-muted)" }}>
                        {char.role === "TANK" ? "🛡️ Tank" : char.role === "HEALER" ? "💚 Healer" : "⚔️ DPS"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right"><ScoreBadge score={score?.all ?? 0} /></td>
                    <td className="py-3 px-4 text-right hidden md:table-cell"><ScoreBadge score={score?.tank ?? 0} /></td>
                    <td className="py-3 px-4 text-right hidden md:table-cell"><ScoreBadge score={score?.healer ?? 0} /></td>
                    <td className="py-3 px-4 text-right hidden md:table-cell"><ScoreBadge score={score?.dps ?? 0} /></td>
                    <td className="py-3 px-4 text-right font-medium hidden sm:table-cell" style={{ color: "var(--wow-text)" }}>
                      {bestRun ? `+${bestRun.level}` : <span style={{ color: "var(--wow-text-faint)" }}>—</span>}
                    </td>
                    <td className="px-2" style={{ color: "var(--wow-text-faint)" }}>
                      {char.mythicRuns.length > 0 ? (isExpanded ? "▲" : "▼") : ""}
                    </td>
                  </tr>

                  {isExpanded && char.mythicRuns.length > 0 && (
                    <tr key={`${char.id}-runs`} style={{ background: "rgba(var(--wow-primary-rgb),0.03)" }}>
                      <td colSpan={9} className="px-6 py-4">
                        <p className="text-xs uppercase tracking-widest mb-3" style={{ fontFamily: "inherit", color: "var(--wow-text-faint)" }}>
                          Best Runs
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                          {char.mythicRuns.map((run) => (
                            <a key={run.id} href={run.url ?? "#"} target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="rounded p-3 block transition-all"
                              style={{ background: "var(--wow-surface-2)", border: "1px solid rgba(var(--wow-primary-rgb),0.12)" }}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold" style={{ color: "var(--wow-text)" }}>{run.shortName}</span>
                                <span className="text-xs font-bold" style={{ color: "var(--wow-gold)" }}>+{run.level}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold" style={{ color: scoreColor(run.score) }}>{run.score.toFixed(1)}</span>
                                <span className="text-xs" style={{ color: "var(--wow-text-muted)" }} title={run.upgrades > 0 ? "Timed" : "Overtime"}>
                                  {upgradeArrows(run.upgrades)}
                                </span>
                              </div>
                              {run.affixes.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {run.affixes.slice(0, 3).map((a) => (
                                    <span key={a} className="text-[10px]" style={{ color: "var(--wow-text-faint)" }}>{a.slice(0, 8)}</span>
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
      )}

      {/* Attribution */}
      <p className="text-xs text-right" style={{ color: "var(--wow-text-faint)" }}>
        M+ data provided by{" "}
        <a href="https://raider.io" target="_blank" rel="noopener noreferrer"
          className="underline hover:text-[#c8a96a] transition-colors" style={{ color: "var(--wow-text-muted)" }}>
          Raider.IO
        </a>
      </p>
    </div>
  );
}
