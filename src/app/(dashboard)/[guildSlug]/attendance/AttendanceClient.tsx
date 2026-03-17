"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { classColor } from "@/lib/wow-constants";

interface Character {
  id: string; name: string; class: string; role: string | null; userId: string | null;
}
interface AttendanceRaid { raidId: string; title: string; date: string; attended: boolean; }
interface AttendanceResponse {
  characters: Character[];
  attendanceMap: Record<string, { attended: number; total: number }>;
  attendanceHistory: Record<string, AttendanceRaid[]>;
  raids: { id: string; title: string; scheduledAt: string }[];
}

function pct(attended: number, total: number) {
  return total ? Math.round((attended / total) * 100) : null;
}

function pctColor(p: number | null) {
  if (p === null) return "var(--wow-text-faint)";
  if (p >= 80) return "var(--wow-success, #40c864)";
  if (p >= 60) return "var(--wow-warning, #f0c040)";
  return "var(--wow-error, #e06060)";
}

export default function AttendanceClient({ guildSlug, isOfficer }: { guildSlug: string; isOfficer: boolean }) {
  const [sortBy, setSortBy] = useState<"name" | "attendance">("attendance");
  const [filterAtRisk, setFilterAtRisk] = useState(false);

  const { data, isLoading } = useQuery<AttendanceResponse>({
    queryKey: ["attendance", guildSlug],
    queryFn: () => fetch(`/api/guild/${guildSlug}/roster?history=true`).then(r => r.json()),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-sm" style={{ color: "var(--wow-text-faint)" }}>Loading attendance data…</span>
      </div>
    );
  }

  const { characters, attendanceMap, attendanceHistory, raids } = data;
  const total = raids?.length ?? 0;

  const withPct = characters.map(c => {
    const att = attendanceMap[c.id] ?? { attended: 0, total };
    const p = pct(att.attended, att.total);
    const history = attendanceHistory?.[c.id] ?? [];
    // Consecutive streak (most recent first)
    let streak = 0;
    for (const r of history) {
      if (r.attended) { if (streak >= 0) streak++; else break; }
      else { if (streak <= 0) streak--; else break; }
    }
    return { ...c, attended: att.attended, total: att.total, pct: p, history, streak };
  });

  const filtered = withPct
    .filter(c => !filterAtRisk || (c.pct !== null && c.pct < 60))
    .sort((a, b) => {
      if (sortBy === "attendance") return (b.pct ?? -1) - (a.pct ?? -1);
      return a.name.localeCompare(b.name);
    });

  const guildAvg = withPct.filter(c => c.pct !== null).length
    ? Math.round(withPct.filter(c => c.pct !== null).reduce((s, c) => s + (c.pct ?? 0), 0) / withPct.filter(c => c.pct !== null).length)
    : null;
  const atRiskCount = withPct.filter(c => c.pct !== null && c.pct < 60).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl wow-heading" style={{ color: "var(--wow-gold-bright)" }}>Attendance</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--wow-text-faint)" }}>
          Based on last {total} raid{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Guild Average", value: guildAvg !== null ? `${guildAvg}%` : "—", color: pctColor(guildAvg) },
          { label: "Raids Tracked", value: total, color: "var(--wow-text)" },
          { label: "At Risk (<60%)", value: atRiskCount, color: atRiskCount > 0 ? "var(--wow-error, #e06060)" : "var(--wow-text-faint)" },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-4 text-center" style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.12)" }}>
            <p className="text-2xl font-bold tabular-nums" style={{ color: s.color as string }}>{s.value}</p>
            <p className="text-xs mt-1 uppercase tracking-widest" style={{ color: "var(--wow-text-faint)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {(["attendance", "name"] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded text-xs transition-all ${sortBy === s ? "wow-tab-active wow-tab" : "wow-tab"}`}>
              {s === "attendance" ? "By Attendance" : "By Name"}
            </button>
          ))}
        </div>
        <button onClick={() => setFilterAtRisk(v => !v)}
          className={`px-3 py-1.5 rounded text-xs transition-all ${filterAtRisk ? "wow-tab-active wow-tab" : "wow-tab"}`}>
          ⚠ At Risk Only
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-x-auto" style={{ border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr style={{ background: "rgba(var(--wow-primary-rgb),0.08)", borderBottom: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--wow-text-faint)" }}>Character</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--wow-text-faint)" }}>Attendance</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--wow-text-faint)" }}>Streak</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--wow-text-faint)" }}>
                Last {Math.min(total, 10)} Raids
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: "var(--wow-text-faint)" }}>No data yet.</td></tr>
            ) : filtered.map((c, i) => (
              <tr key={c.id} style={{ borderTop: i > 0 ? "1px solid rgba(var(--wow-primary-rgb),0.08)" : undefined }}>
                <td className="px-4 py-3 font-medium" style={{ color: classColor(c.class) }}>{c.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(var(--wow-primary-rgb),0.12)" }}>
                      <div className="h-full rounded-full" style={{ width: `${c.pct ?? 0}%`, background: pctColor(c.pct) }} />
                    </div>
                    <span className="tabular-nums text-xs font-semibold" style={{ color: pctColor(c.pct) }}>
                      {c.pct !== null ? `${c.pct}%` : "—"}
                    </span>
                    <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>({c.attended}/{c.total})</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs tabular-nums">
                  {c.streak > 0 ? (
                    <span style={{ color: "var(--wow-success, #40c864)" }}>+{c.streak} ✓</span>
                  ) : c.streak < 0 ? (
                    <span style={{ color: "var(--wow-error, #e06060)" }}>{c.streak} ✗</span>
                  ) : (
                    <span style={{ color: "var(--wow-text-faint)" }}>—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {c.history.slice(0, 10).map((r) => (
                      <span key={r.raidId} title={`${r.title} — ${new Date(r.date).toLocaleDateString()}`}
                        className="w-4 h-4 rounded-sm text-center text-xs leading-4 shrink-0"
                        style={{ background: r.attended ? "rgba(64,200,100,0.2)" : "rgba(200,60,60,0.15)", color: r.attended ? "#40c864" : "#e06060" }}>
                        {r.attended ? "✓" : "✗"}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
