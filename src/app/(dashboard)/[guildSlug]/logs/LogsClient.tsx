"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface LogReport { id: string; wclCode: string; title: string; zone: string | null; startTime: string | Date; fightCount: number; _count: { parses: number }; }
interface Guild { id: string; name: string; wclGuildId: string | null; }

export default function LogsClient({ guildSlug, isOfficer }: {
  guildSlug: string; isOfficer: boolean;
}) {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

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
          <p className="text-sm mb-3" style={{ color: "var(--wow-text-muted)" }}>Link your guild&apos;s Warcraft Logs profile in Settings to enable automatic log syncing and parse tracking.</p>
          <Link href={`/${guildSlug}/settings`} className="wow-btn inline-block">
            Go to Settings →
          </Link>
        </div>
      )}

      {reports.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--wow-text-faint)" }}>{hasWcl ? "No reports synced yet. Click 'Sync from WCL' above." : "No reports yet."}</p>
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
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs font-mono" style={{ color: "var(--wow-text-faint)" }}>{r.wclCode}</p>
                  </td>
                  <td className="px-4 py-3">{r.zone ?? <span style={{ color: "var(--wow-text-faint)", fontStyle: "italic" }}>Unknown</span>}</td>
                  <td className="px-4 py-3" style={{ color: "var(--wow-text-muted)", whiteSpace: "nowrap" }}>
                    {new Date(r.startTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-center" style={{ color: "var(--wow-text-muted)" }}>{r.fightCount}</td>
                  <td className="px-4 py-3 text-center" style={{ color: "var(--wow-text-muted)" }}>{r._count.parses}</td>
                  <td className="px-4 py-3 text-right">
                    <a href={`https://www.warcraftlogs.com/reports/${r.wclCode}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs" style={{ color: "var(--wow-gold)" }}>View on WCL ↗</a>
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
