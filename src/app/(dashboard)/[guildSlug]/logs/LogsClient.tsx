"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface LogReport { id: string; wclCode: string; title: string; zone: string | null; startTime: string | Date; fightCount: number; _count: { parses: number }; }
interface Guild { id: string; name: string; wclGuildId: string | null; }

export default function LogsClient({ reports, guild, guildSlug, isOfficer }: {
  reports: LogReport[]; guild: Guild; guildSlug: string; isOfficer: boolean;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  async function syncReports() {
    setSyncing(true); setMessage("");
    try {
      const res = await fetch(`/api/logs/sync?guildSlug=${guildSlug}`, { method: "POST" });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (res.ok) {
        setMessage(`✓ Synced ${data.count} reports`);
        // Refresh server component data so the table updates
        router.refresh();
      } else {
        setMessage(`Error: ${data.error ?? "Sync failed"}`);
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
    setSyncing(false);
  }

  const hasWcl = !!guild.wclGuildId;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Logs</h1>
        {isOfficer && hasWcl && (
          <button onClick={syncReports} disabled={syncing}
            className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {syncing ? "Syncing…" : "↺ Sync from WCL"}
          </button>
        )}
      </div>

      {message && <p className="mb-4 text-sm text-blue-400">{message}</p>}

      {!hasWcl && isOfficer && (
        <div className="bg-purple-900/20 border border-purple-700/50 rounded-xl p-5 mb-6">
          <p className="text-purple-300 font-medium mb-1">Connect Warcraft Logs</p>
          <p className="text-gray-400 text-sm mb-3">Link your guild&apos;s Warcraft Logs profile in Settings to enable automatic log syncing and parse tracking.</p>
          <Link href={`/${guildSlug}/settings`}
            className="inline-block bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Go to Settings →
          </Link>
        </div>
      )}

      {reports.length === 0 ? (
        <p className="text-gray-600 text-sm">{hasWcl ? "No reports synced yet. Click 'Sync from WCL' above." : "No reports yet."}</p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide">
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
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white text-sm font-medium">{r.title}</p>
                    <p className="text-gray-600 text-xs font-mono">{r.wclCode}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{r.zone ?? <span className="text-gray-600 italic">Unknown</span>}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">
                    {new Date(r.startTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm text-center">{r.fightCount}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm text-center">{r._count.parses}</td>
                  <td className="px-4 py-3 text-right">
                    <a href={`https://www.warcraftlogs.com/reports/${r.wclCode}`} target="_blank" rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-xs">View on WCL ↗</a>
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
