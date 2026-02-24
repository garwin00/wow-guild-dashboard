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
        <h1 className="text-3xl font-bold text-white mb-4">Live Logs</h1>
        <div className="bg-purple-900/20 border border-purple-700/50 rounded-xl p-6">
          <p className="text-purple-300 font-medium mb-2">Warcraft Logs not connected</p>
          <p className="text-gray-400 text-sm mb-1">To enable live log tracking you need two things:</p>
          <ol className="list-decimal list-inside text-sm text-gray-400 space-y-1 mb-4 ml-1">
            <li><code className="bg-gray-800 px-1 rounded text-xs">WCL_CLIENT_ID</code> and <code className="bg-gray-800 px-1 rounded text-xs">WCL_CLIENT_SECRET</code> added to <code className="bg-gray-800 px-1 rounded text-xs">.env.local</code> — create a client at <a href="https://www.warcraftlogs.com/api/clients/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">warcraftlogs.com/api/clients ↗</a></li>
            <li>Your guild name linked in <Link href={`/${guildSlug}/settings`} className="text-purple-400 hover:text-purple-300">Settings</Link></li>
          </ol>
          <Link href={`/${guildSlug}/settings`}
            className="inline-block bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
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
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Live Logs
            {active && active.endTime === 0 && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-red-400 bg-red-900/30 border border-red-800 rounded-full px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </span>
            )}
          </h1>
          {active && (
            <p className="text-gray-400 text-sm mt-1">
              {active.zone?.name ?? "Unknown Zone"} · Started {fmtTime(active.startTime)} ·{" "}
              <a href={`https://www.warcraftlogs.com/reports/${active.code}`} target="_blank" rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300">{active.code}</a>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <p className="text-gray-600 text-xs">Updated {lastRefresh.toLocaleTimeString("en-GB")}</p>
          )}
          <button onClick={refresh} disabled={loading}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {loading ? "Refreshing…" : "↺ Refresh"}
          </button>
        </div>
      </div>

      {!active ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <p className="text-4xl mb-3">🎮</p>
          <p className="text-gray-300 font-medium">No active raid in progress</p>
          <p className="text-gray-500 text-sm mt-1">Start the WarcraftLogs Uploader and begin logging to see live data here.</p>
          <p className="text-gray-600 text-xs mt-3">This page auto-refreshes every 30s once a log is detected.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current fight */}
          {currentFight && (
            <div className="bg-red-900/20 border border-red-800/60 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-400 uppercase tracking-widest mb-1">In Progress</p>
                  <p className="text-white font-bold text-xl">{currentFight.name}</p>
                  <p className="text-gray-400 text-sm">{DIFFICULTY[currentFight.difficulty ?? 0] ?? "Unknown"} · {playerCount} players</p>
                </div>
                {currentFight.bossPercentage != null && (
                  <div className="text-right">
                    <p className="text-3xl font-bold text-red-400">{currentFight.bossPercentage.toFixed(1)}%</p>
                    <p className="text-gray-500 text-xs">boss HP</p>
                  </div>
                )}
              </div>
              {currentFight.bossPercentage != null && (
                <div className="mt-3 bg-gray-800 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${currentFight.bossPercentage}%` }} />
                </div>
              )}
            </div>
          )}

          {/* Boss attempt history */}
          {Object.keys(byBoss).length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800">
                <h2 className="text-white font-semibold">Attempt History</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide">
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
                      <tr key={bossName} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-white font-medium text-sm">{bossName}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{DIFFICULTY[last.difficulty ?? 0] ?? "?"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-gray-300 text-sm">{attempts.length}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-semibold ${(best.bossPercentage ?? 100) <= 5 ? "text-orange-400" : (best.bossPercentage ?? 100) <= 20 ? "text-yellow-400" : "text-gray-300"}`}>
                            {best.bossPercentage != null ? `${best.bossPercentage.toFixed(1)}%` : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{fmtTime(last.startTime)}</td>
                        <td className="px-4 py-3 text-center text-gray-400 text-sm tabular-nums">{fmtDuration(duration)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Player list */}
          {report?.masterData?.actors && report.masterData.actors.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-3">Raiders Online ({playerCount})</h2>
              <div className="flex flex-wrap gap-2">
                {report.masterData.actors.map((actor) => (
                  <span key={actor.id} className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300">{actor.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
