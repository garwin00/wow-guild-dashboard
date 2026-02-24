"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Guild {
  id: string; name: string; realm: string; region: string; slug: string;
  createdAt: Date;
  _count: { memberships: number; characters: number; raidEvents: number };
}
interface User {
  id: string; email: string | null; battletag: string; bnetId: string;
  isAdmin: boolean; createdAt: Date;
  _count: { memberships: number; characters: number };
}

interface Props { guilds: Guild[]; users: User[] }

export default function AdminClient({ guilds, users }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"guilds" | "users">("guilds");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function toggleAdmin(userId: string, current: boolean) {
    setTogglingId(userId);
    await fetch("/api/admin/toggle-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isAdmin: !current }),
    });
    setTogglingId(null);
    router.refresh();
  }

  const th = "text-left text-xs uppercase tracking-widest pb-2 px-3";
  const td = "px-3 py-2.5 text-sm";
  const thStyle = { color: "var(--wow-text-faint)", borderBottom: "1px solid rgba(var(--wow-primary-rgb),0.15)" };
  const trStyle = { borderBottom: "1px solid rgba(var(--wow-primary-rgb),0.08)" };

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--wow-bg)", color: "var(--wow-text)" }}>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--wow-gold-bright)" }}>⚙️ Platform Admin</h1>
          <p className="text-sm mt-1" style={{ color: "var(--wow-text-faint)" }}>zugzug.pro administration</p>
        </div>
        <a href="/" className="wow-btn-ghost text-sm">← Back to Dashboard</a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Guilds", value: guilds.length },
          { label: "Total Users", value: users.length },
          { label: "Total Members", value: guilds.reduce((a, g) => a + g._count.memberships, 0) },
          { label: "Admins", value: users.filter(u => u.isAdmin).length },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-4 text-center"
            style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
            <p className="text-2xl font-bold" style={{ color: "var(--wow-gold)" }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--wow-text-faint)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4" style={{ borderBottom: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
        {(["guilds", "users"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 text-sm capitalize transition-colors"
            style={{
              color: tab === t ? "var(--wow-gold-bright)" : "var(--wow-text-muted)",
              borderBottom: tab === t ? "2px solid #c8a96a" : "2px solid transparent",
              background: "none",
            }}>
            {t} ({t === "guilds" ? guilds.length : users.length})
          </button>
        ))}
      </div>

      {/* Guilds table */}
      {tab === "guilds" && (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
          <table className="w-full">
            <thead style={{ background: "#0a0b10" }}>
              <tr>
                {["Guild", "Realm", "Members", "Characters", "Raids", "Created"].map(h => (
                  <th key={h} className={th} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guilds.map(g => (
                <tr key={g.id} style={trStyle}>
                  <td className={td}>
                    <div>
                      <p className="font-medium" style={{ color: "var(--wow-text)" }}>{g.name}</p>
                      <p className="text-xs" style={{ color: "var(--wow-text-faint)" }}>{g.slug}</p>
                    </div>
                  </td>
                  <td className={td} style={{ color: "var(--wow-text-muted)" }}>{g.realm} ({g.region.toUpperCase()})</td>
                  <td className={td} style={{ color: "var(--wow-gold)" }}>{g._count.memberships}</td>
                  <td className={td} style={{ color: "var(--wow-text-muted)" }}>{g._count.characters}</td>
                  <td className={td} style={{ color: "var(--wow-text-muted)" }}>{g._count.raidEvents}</td>
                  <td className={td} style={{ color: "var(--wow-text-faint)" }}>{new Date(g.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Users table */}
      {tab === "users" && (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
          <table className="w-full">
            <thead style={{ background: "#0a0b10" }}>
              <tr>
                {["User", "Email", "Guilds", "Characters", "Joined", "Admin"].map(h => (
                  <th key={h} className={th} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isBnet = !u.bnetId.startsWith("email:");
                return (
                  <tr key={u.id} style={trStyle}>
                    <td className={td}>
                      <div>
                        <p className="font-medium" style={{ color: "var(--wow-text)" }}>{u.battletag}</p>
                        <p className="text-xs" style={{ color: "var(--wow-text-faint)" }}>{isBnet ? "🎮 Battle.net" : "📧 Email"}</p>
                      </div>
                    </td>
                    <td className={td} style={{ color: "var(--wow-text-muted)" }}>{u.email ?? "—"}</td>
                    <td className={td} style={{ color: "var(--wow-gold)" }}>{u._count.memberships}</td>
                    <td className={td} style={{ color: "var(--wow-text-muted)" }}>{u._count.characters}</td>
                    <td className={td} style={{ color: "var(--wow-text-faint)" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className={td}>
                      <button
                        onClick={() => toggleAdmin(u.id, u.isAdmin)}
                        disabled={togglingId === u.id}
                        className="text-xs px-2 py-1 rounded transition-colors"
                        style={{
                          background: u.isAdmin ? "rgba(var(--wow-primary-rgb),0.15)" : "rgba(90,80,64,0.2)",
                          border: `1px solid ${u.isAdmin ? "rgba(var(--wow-primary-rgb),0.4)" : "rgba(90,80,64,0.4)"}`,
                          color: u.isAdmin ? "var(--wow-gold)" : "var(--wow-text-faint)",
                          cursor: togglingId === u.id ? "wait" : "pointer",
                        }}>
                        {u.isAdmin ? "✓ Admin" : "Make Admin"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
