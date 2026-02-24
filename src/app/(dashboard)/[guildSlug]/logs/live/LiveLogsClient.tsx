"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Fight {
  id: number;
  name: string;
  difficulty: number | null;
  bossPercentage: number | null;
  fightPercentage: number | null;
  startTime: number;
  endTime: number;
  friendlyPlayers: number[];
}

interface Actor { id: number; name: string; subType: string; }

interface LiveReport {
  title: string;
  startTime: number;
  endTime: number;
  zone: { name: string } | null;
  fights: Fight[];
  masterData: { actors: Actor[] };
}

interface ActiveReport {
  code: string;
  title: string;
  startTime: number;
  endTime: number;
  zone: { name: string; id: number } | null;
}

const DIFFICULTY: Record<number, string> = {
  1: "LFR", 2: "Flex", 3: "Normal", 4: "Heroic", 5: "Mythic",
};

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function LiveLogsClient({ guildSlug, hasWcl }: { guildSlug: string; hasWcl: boolean }) {
  const [active, setActive] = useState<ActiveReport | null>(null);
  const [report, setReport] = useState<LiveReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [pollActive, setPollActive] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/logs/live?guildSlug=${guildSlug}`);
    const data = await res.json();
    setActive(data.active ?? null);
    setReport(data.fights ?? null);
    setLastRefresh(new Date());
    setLoading(false);
  }, [guildSlug]);

  // Initial load
  useEffect(() => { refresh(); }, [refresh]);

  // Auto-poll every 30s when a live report is active
  useEffect(() => {
    if (!pollActive) return;
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [pollActive, refresh]);

  // Start polling when we detect an active report
  useEffect(() => {
    setPollActive(!!active && active.endTime === 0);
  }, [active]);

  if (!hasWcl) {
    return (
      <div className="p-8">
        <h1 className="wow-heading text-3xl font-bold" style={{ color: "var(--wow-gold-bright)", marginBottom: "1rem" }}>Live Logs</h1>
        <div className="wow-panel p-6">
          <p style={{ color: "var(--wow-gold-bright)", fontWeight: 600, marginBottom: "0.5rem" }}>Warcraft Logs not connected</p>
          <p className="text-sm mb-1" style={{ color: "var(--wow-text-muted)" }}>To enable live log tracking you need two things:</p>
          <ol className="list-decimal list-inside space-y-1 mb-4 ml-1 text-sm" style={{ color: "var(--wow-text-muted)" }}>
            <li><code className="text-xs" style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)", padding: "0 0.25rem", borderRadius: "0.25rem", color: "var(--wow-gold)" }}>WCL_CLIENT_ID</code> and <code className="text-xs" style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)", padding: "0 0.25rem", borderRadius: "0.25rem", color: "var(--wow-gold)" }}>WCL_CLIENT_SECRET</code> added to <code className="text-xs" style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)", padding: "0 0.25rem", borderRadius: "0.25rem", color: "var(--wow-gold)" }}>.env.local</code> — create a client at <a href="https://www.warcraftlogs.com/api/clients/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--wow-gold)" }}>warcraftlogs.com/api/clients ↗</a></li>
            <li>Your guild name linked in <Link href={`/${guildSlug}/settings`} style={{ color: "var(--wow-gold)" }}>Settings</Link></li>
          </ol>
          <Link href={`/${guildSlug}/settings`} className="wow-btn inline-block">
            Go to Settings →
          </Link>
        </div>
      </div>
    );
  }

  const bossFights = report?.fights.filter((f) => f.endTime > 0) ?? [];
  const currentFight = report?.fights.find((f) => f.endTime === 0);
  const playerCount = report?.masterData?.actors?.length ?? 0;

  // Group boss attempts
  const byBoss: Record<string, Fight[]> = {};
  for (const f of bossFights) {
    if (!byBoss[f.name]) byBoss[f.name] = [];
    byBoss[f.name].push(f);
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="wow-heading text-3xl font-bold flex items-center gap-3" style={{ color: "var(--wow-gold-bright)" }}>
            Live Logs
            {active && active.endTime === 0 && (
              <span className="flex items-center gap-1.5 text-sm font-medium rounded-full px-3 py-1" style={{ color: "var(--wow-error)", background: "rgba(200,64,64,0.15)", border: "1px solid rgba(200,64,64,0.4)" }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--wow-error)" }} />
                LIVE
              </span>
            )}
          </h1>
          {active && (
            <p className="text-sm mt-1" style={{ color: "var(--wow-text-muted)" }}>
              {active.zone?.name ?? "Unknown Zone"} · Started {fmtTime(active.startTime)} ·{" "}
              <a href={`https://www.warcraftlogs.com/reports/${active.code}`} target="_blank" rel="noopener noreferrer"
                style={{ color: "var(--wow-gold)" }}>{active.code}</a>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <p className="text-xs" style={{ color: "var(--wow-text-faint)" }}>Updated {lastRefresh.toLocaleTimeString("en-GB")}</p>
          )}
          <button onClick={refresh} disabled={loading} className="wow-btn-ghost" style={{ opacity: loading ? 0.5 : 1 }}>
            {loading ? "Refreshing…" : "↺ Refresh"}
          </button>
        </div>
      </div>

      {!active ? (
        <div className="wow-panel p-10 text-center">
          <p className="text-4xl mb-3">🎮</p>
          <p style={{ color: "var(--wow-text)", fontWeight: 500 }}>No active raid in progress</p>
          <p className="text-sm mt-1" style={{ color: "var(--wow-text-faint)" }}>Start the WarcraftLogs Uploader and begin logging to see live data here.</p>
          <p className="text-xs mt-3" style={{ color: "var(--wow-text-faint)" }}>This page auto-refreshes every 30s once a log is detected.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current fight */}
          {currentFight && (
            <div style={{ background: "rgba(200,64,64,0.12)", border: "1px solid rgba(200,64,64,0.35)", borderRadius: "0.75rem", padding: "1.25rem" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase mb-1" style={{ color: "var(--wow-error)", letterSpacing: "0.1em" }}>In Progress</p>
                  <p className="text-xl font-bold" style={{ color: "var(--wow-text)" }}>{currentFight.name}</p>
                  <p className="text-sm" style={{ color: "var(--wow-text-muted)" }}>{DIFFICULTY[currentFight.difficulty ?? 0] ?? "Unknown"} · {playerCount} players</p>
                </div>
                {currentFight.bossPercentage != null && (
                  <div className="text-right">
                    <p className="text-3xl font-bold" style={{ color: "var(--wow-error)" }}>{currentFight.bossPercentage.toFixed(1)}%</p>
                    <p className="text-xs" style={{ color: "var(--wow-text-faint)" }}>boss HP</p>
                  </div>
                )}
              </div>
              {currentFight.bossPercentage != null && (
                <div className="mt-3 rounded-full h-2" style={{ background: "var(--wow-bg)" }}>
                  <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${currentFight.bossPercentage}%`, background: "var(--wow-error)" }} />
                </div>
              )}
            </div>
          )}

          {/* Boss attempt history */}
          {Object.keys(byBoss).length > 0 && (
            <div className="wow-panel overflow-hidden">
              <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
                <h2 style={{ color: "var(--wow-text)", fontWeight: 600 }}>Attempt History</h2>
              </div>
              <table className="wow-table w-full">
                <thead>
                  <tr>
                    <th className="px-4 py-3">Boss</th>
                    <th className="px-4 py-3">Difficulty</th>
                    <th className="px-4 py-3 text-center">Attempts</th>
                    <th className="px-4 py-3 text-center">Best %</th>
                    <th className="px-4 py-3">Last Pull</th>
                    <th className="px-4 py-3 text-center">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(byBoss).map(([bossName, attempts]) => {
                    const best = attempts.reduce((b, a) => (a.bossPercentage ?? 100) < (b.bossPercentage ?? 100) ? a : b);
                    const last = attempts[attempts.length - 1];
                    const duration = last.endTime - last.startTime;
                    return (
                      <tr key={bossName}>
                        <td className="px-4 py-3 font-medium">{bossName}</td>
                        <td className="px-4 py-3" style={{ color: "var(--wow-text-muted)" }}>{DIFFICULTY[last.difficulty ?? 0] ?? "?"}</td>
                        <td className="px-4 py-3 text-center">
                          <span>{attempts.length}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold" style={{ color: (best.bossPercentage ?? 100) <= 5 ? "var(--wow-gold-bright)" : (best.bossPercentage ?? 100) <= 20 ? "var(--wow-gold)" : "var(--wow-text)" }}>
                            {best.bossPercentage != null ? `${best.bossPercentage.toFixed(1)}%` : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--wow-text-muted)" }}>{fmtTime(last.startTime)}</td>
                        <td className="px-4 py-3 text-center tabular-nums" style={{ color: "var(--wow-text-muted)" }}>{fmtDuration(duration)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Player list */}
          {report?.masterData?.actors && report.masterData.actors.length > 0 && (
            <div className="wow-panel p-5">
              <h2 className="font-semibold mb-3" style={{ color: "var(--wow-text)" }}>Raiders Online ({playerCount})</h2>
              <div className="flex flex-wrap gap-2">
                {report.masterData.actors.map((actor) => (
                  <span key={actor.id} className="text-xs px-2 py-1 rounded" style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)", color: "var(--wow-text)" }}>{actor.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
