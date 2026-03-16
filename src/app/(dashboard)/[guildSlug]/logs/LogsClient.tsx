"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { classColor, parseColor } from "@/lib/wow-constants";

interface LogReport {
  id: string;
  wclCode: string;
  title: string;
  zone: string | null;
  startTime: string | Date;
  fightCount: number;
  _count: { parses: number };
}
interface Guild { id: string; name: string; wclGuildId: string | null }

interface RankingEntry {
  name: string;
  class: string;
  spec: string;
  amount: number;
  rankPercent: number;
  type: string;
}
interface FightRanking {
  fightID: number;
  encounter: { id: number; name: string };
  duration: number;
  rankings: RankingEntry[];
}
interface BreakdownData {
  title: string;
  rankings: FightRanking[];
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function BossBreakdown({ guildSlug, reportCode }: { guildSlug: string; reportCode: string }) {
  const [activeFight, setActiveFight] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<BreakdownData>({
    queryKey: ["fight-dps", guildSlug, reportCode],
    queryFn: () =>
      fetch(`/api/guild/${guildSlug}/logs/fight-dps?reportCode=${reportCode}`).then((r) =>
        r.ok ? r.json() : r.json().then((d) => Promise.reject(new Error(d.error ?? "Failed")))
      ),
  });

  if (isLoading)
    return (
      <div className="px-6 py-4">
        <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>
          Loading boss breakdown…
        </span>
      </div>
    );

  if (error || !data)
    return (
      <div className="px-6 py-4">
        <span className="text-xs" style={{ color: "var(--wow-error, #e53e3e)" }}>
          {error instanceof Error ? error.message : "Could not load breakdown"}
        </span>
      </div>
    );

  const { rankings } = data;

  if (!rankings.length)
    return (
      <div className="px-6 py-4">
        <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>
          No kill data available for this report.
        </span>
      </div>
    );

  const currentFight = activeFight !== null ? rankings.find((r) => r.fightID === activeFight) : rankings[0];
  const players = (currentFight?.rankings ?? [])
    .slice()
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="px-4 py-4 border-t" style={{ borderColor: "rgba(var(--wow-primary-rgb),0.12)", background: "var(--wow-bg)" }}>
      {/* Boss tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {rankings.map((r) => {
          const isActive = (activeFight ?? rankings[0]?.fightID) === r.fightID;
          return (
            <button
              key={r.fightID}
              onClick={() => setActiveFight(r.fightID)}
              className="text-xs px-3 py-1 rounded transition-colors"
              style={
                isActive
                  ? { background: "rgba(var(--wow-primary-rgb),0.18)", color: "var(--wow-gold-bright)", border: "1px solid var(--wow-gold)" }
                  : { background: "var(--wow-surface-2)", color: "var(--wow-text-muted)", border: "1px solid rgba(var(--wow-primary-rgb),0.1)" }
              }
            >
              {r.encounter.name}
              <span className="ml-1.5 opacity-60">{fmtDuration(r.duration)}</span>
            </button>
          );
        })}
      </div>

      {currentFight && players.length > 0 && (
        <>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--wow-text-faint)" }}>
            DPS / HPS — {currentFight.encounter.name}
          </p>
          <ResponsiveContainer width="100%" height={Math.max(180, players.length * 28)}>
            <BarChart
              data={players}
              layout="vertical"
              margin={{ top: 0, right: 60, bottom: 0, left: 100 }}
            >
              <XAxis
                type="number"
                tickFormatter={fmt}
                tick={{ fill: "var(--wow-text-faint)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={96}
                tick={{ fill: "var(--wow-text-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(var(--wow-primary-rgb),0.07)" }}
                contentStyle={{
                  background: "var(--wow-surface)",
                  border: "1px solid rgba(var(--wow-primary-rgb),0.2)",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "var(--wow-text)",
                }}
                formatter={(value: number | undefined, _name?: string, props?: { payload?: { rankPercent?: number; spec?: string } }) => [
                  `${fmt(value ?? 0)} · ${props?.payload?.rankPercent?.toFixed(1) ?? "?"}%`,
                  props?.payload?.spec ?? "",
                ]}
              />
              <Bar dataKey="amount" radius={[0, 3, 3, 0]} maxBarSize={20}>
                {players.map((p, i) => (
                  <Cell
                    key={i}
                    fill={classColor(p.class)}
                    fillOpacity={0.85}
                    stroke={parseColor(p.rankPercent)}
                    strokeWidth={1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}

export default function LogsClient({ guildSlug, isOfficer }: {
  guildSlug: string;
  isOfficer: boolean;
}) {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ reports: LogReport[]; guild: Guild }>({
    queryKey: ["logs", guildSlug],
    queryFn: () => fetch(`/api/guild/${guildSlug}/logs`).then((r) => r.json()),
  });

  async function syncReports() {
    setSyncing(true); setMessage("");
    try {
      const res = await fetch(`/api/logs/sync?guildSlug=${guildSlug}`, { method: "POST" });
      const text = await res.text();
      const d = text ? JSON.parse(text) : {};
      if (res.ok) {
        setMessage(`✓ Synced ${d.count} reports`);
        queryClient.invalidateQueries({ queryKey: ["logs", guildSlug] });
      } else {
        setMessage(`Error: ${d.error ?? "Sync failed"}`);
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
    setSyncing(false);
  }

  if (isLoading || !data) {
    return (
      <div className="p-8 flex items-center justify-center py-24">
        <span className="text-sm" style={{ color: "var(--wow-text-faint)" }}>Loading…</span>
      </div>
    );
  }

  const { reports, guild } = data;
  const hasWcl = !!guild.wclGuildId;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="wow-heading text-3xl font-bold" style={{ color: "var(--wow-gold-bright)" }}>Logs</h1>
        {isOfficer && hasWcl && (
          <button onClick={syncReports} disabled={syncing} className="wow-btn" style={{ opacity: syncing ? 0.5 : 1 }}>
            {syncing ? "Syncing…" : "↺ Sync from WCL"}
          </button>
        )}
      </div>

      {message && <p className="mb-4 text-sm" style={{ color: "var(--wow-gold)" }}>{message}</p>}

      {!hasWcl && isOfficer && (
        <div className="wow-panel p-5 mb-6">
          <p style={{ color: "var(--wow-gold-bright)", fontWeight: 600, marginBottom: "0.25rem" }}>Connect Warcraft Logs</p>
          <p className="text-sm mb-3" style={{ color: "var(--wow-text-muted)" }}>
            Link your guild&apos;s Warcraft Logs profile in Settings to enable automatic log syncing and parse tracking.
          </p>
          <Link href={`/${guildSlug}/settings`} className="wow-btn inline-block">
            Go to Settings →
          </Link>
        </div>
      )}

      {reports.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--wow-text-faint)" }}>
          {hasWcl ? "No reports synced yet. Click 'Sync from WCL' above." : "No reports yet."}
        </p>
      ) : (
        <div className="wow-panel overflow-hidden">
          <table className="wow-table w-full">
            <thead>
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Zone</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-center">Fights</th>
                <th className="px-4 py-3 text-center">Parses</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <>
                  <tr
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => setExpandedCode(expandedCode === r.wclCode ? null : r.wclCode)}
                    style={{ background: expandedCode === r.wclCode ? "rgba(var(--wow-primary-rgb),0.05)" : undefined }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>
                          {expandedCode === r.wclCode ? "▼" : "▶"}
                        </span>
                        <div>
                          <p className="font-medium">{r.title}</p>
                          <p className="text-xs font-mono" style={{ color: "var(--wow-text-faint)" }}>{r.wclCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.zone ?? <span style={{ color: "var(--wow-text-faint)", fontStyle: "italic" }}>Unknown</span>}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--wow-text-muted)", whiteSpace: "nowrap" }}>
                      {new Date(r.startTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--wow-text-muted)" }}>{r.fightCount}</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--wow-text-muted)" }}>{r._count.parses}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`https://www.warcraftlogs.com/reports/${r.wclCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs"
                        style={{ color: "var(--wow-gold)" }}
                      >
                        View on WCL ↗
                      </a>
                    </td>
                  </tr>
                  {expandedCode === r.wclCode && (
                    <tr key={`${r.id}-breakdown`}>
                      <td colSpan={6} className="p-0">
                        <BossBreakdown guildSlug={guildSlug} reportCode={r.wclCode} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
