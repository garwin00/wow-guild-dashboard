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
        <h1 className="wow-heading text-3xl font-bold" style={{ color: "#f0c040" }}>Logs</h1>
        {isOfficer && hasWcl && (
          <button onClick={syncReports} disabled={syncing} className="wow-btn" style={{ opacity: syncing ? 0.5 : 1 }}>
            {syncing ? "Syncing…" : "↺ Sync from WCL"}
          </button>
        )}
      </div>

      {message && <p className="mb-4 text-sm" style={{ color: "#c8a96a" }}>{message}</p>}

      {!hasWcl && isOfficer && (
        <div style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)", borderRadius: "0.5rem", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <p style={{ color: "#f0c040", fontWeight: 600, marginBottom: "0.25rem" }}>Connect Warcraft Logs</p>
          <p style={{ color: "#8a8070", fontSize: "0.875rem", marginBottom: "0.75rem" }}>Link your guild&apos;s Warcraft Logs profile in Settings to enable automatic log syncing and parse tracking.</p>
          <Link href={`/${guildSlug}/settings`} className="wow-btn inline-block">
            Go to Settings →
          </Link>
        </div>
      )}

      {reports.length === 0 ? (
        <p style={{ color: "#5a5040", fontSize: "0.875rem" }}>{hasWcl ? "No reports synced yet. Click 'Sync from WCL' above." : "No reports yet."}</p>
      ) : (
        <div style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.15)", borderRadius: "0.5rem", overflow: "hidden" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(200,169,106,0.15)", textAlign: "left", fontSize: "0.75rem", fontFamily: "inherit", color: "#5a5040", textTransform: "uppercase", letterSpacing: "0.05em" }}>
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
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(200,169,106,0.07)" }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(200,169,106,0.04)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td className="px-4 py-3">
                    <p style={{ color: "#e8dfc8", fontSize: "0.875rem", fontWeight: 500 }}>{r.title}</p>
                    <p style={{ color: "#5a5040", fontSize: "0.75rem", fontFamily: "monospace" }}>{r.wclCode}</p>
                  </td>
                  <td className="px-4 py-3" style={{ color: "#e8dfc8", fontSize: "0.875rem" }}>{r.zone ?? <span style={{ color: "#5a5040", fontStyle: "italic" }}>Unknown</span>}</td>
                  <td className="px-4 py-3" style={{ color: "#8a8070", fontSize: "0.875rem", whiteSpace: "nowrap" }}>
                    {new Date(r.startTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-center" style={{ color: "#8a8070", fontSize: "0.875rem" }}>{r.fightCount}</td>
                  <td className="px-4 py-3 text-center" style={{ color: "#8a8070", fontSize: "0.875rem" }}>{r._count.parses}</td>
                  <td className="px-4 py-3 text-right">
                    <a href={`https://www.warcraftlogs.com/reports/${r.wclCode}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: "#c8a96a", fontSize: "0.75rem" }}>View on WCL ↗</a>
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
