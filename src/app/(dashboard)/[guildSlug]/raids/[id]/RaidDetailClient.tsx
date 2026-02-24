"use client";

import { useState } from "react";

type SignupStatus = "ACCEPTED" | "TENTATIVE" | "DECLINED";
interface Character { id: string; name: string; class: string; role: string; }
interface Signup { id: string; status: SignupStatus; note: string | null; character: Character; }
interface RaidEvent { id: string; title: string; raidZone: string; scheduledAt: string | Date; maxAttendees: number; status: string; description: string | null; _count: { signups: number }; }

const STATUS_COLORS: Record<SignupStatus, string> = {
  ACCEPTED: "bg-green-900/40 border-green-700 text-green-300",
  TENTATIVE: "bg-yellow-900/40 border-yellow-700 text-yellow-300",
  DECLINED: "bg-red-900/30 border-red-800 text-red-400",
};
const STATUS_ICON: Record<SignupStatus, string> = { ACCEPTED: "✓", TENTATIVE: "?", DECLINED: "✗" };

export default function RaidDetailClient({ event, signups: initial, guildSlug, isOfficer, userCharacters, userId }: {
  event: RaidEvent; signups: Signup[]; guildSlug: string; isOfficer: boolean; userCharacters: Character[]; userId: string;
}) {
  const [signups, setSignups] = useState(initial);
  const [selectedChar, setSelectedChar] = useState(userCharacters[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<SignupStatus | "ALL">("ALL");

  async function submitSignup(status: SignupStatus) {
    if (!selectedChar) return;
    setSubmitting(true);
    const res = await fetch("/api/raids/signup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raidEventId: event.id, characterId: selectedChar, status, note }),
    });
    const data = await res.json();
    if (res.ok) {
      setSignups((prev) => {
        const existing = prev.findIndex((s) => s.character.id === selectedChar);
        const char = userCharacters.find((c) => c.id === selectedChar)!;
        const updated = { ...data, character: char };
        return existing >= 0 ? prev.map((s, i) => i === existing ? updated : s) : [...prev, updated];
      });
    }
    setSubmitting(false);
  }

  async function officerUpdate(signupId: string, status: SignupStatus) {
    await fetch("/api/raids/signup", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signupId, status, guildSlug }),
    });
    setSignups((prev) => prev.map((s) => s.id === signupId ? { ...s, status } : s));
  }

  const date = new Date(event.scheduledAt);
  const tabs: (SignupStatus | "ALL")[] = ["ALL", "ACCEPTED", "TENTATIVE", "DECLINED"];
  const counts = { ACCEPTED: signups.filter(s => s.status === "ACCEPTED").length, TENTATIVE: signups.filter(s => s.status === "TENTATIVE").length, DECLINED: signups.filter(s => s.status === "DECLINED").length };
  const displayed = activeTab === "ALL" ? signups : signups.filter(s => s.status === activeTab);

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <p style={{ color: "var(--wow-text-muted)", fontSize: "0.875rem", marginBottom: "0.25rem", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.05em" }}>{event.raidZone}</p>
        <h1 className="wow-heading text-3xl font-bold" style={{ color: "var(--wow-gold-bright)" }}>{event.title}</h1>
        <p style={{ color: "var(--wow-text-muted)", marginTop: "0.25rem" }}>
          {date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} at {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </p>
        {event.description && <p style={{ color: "var(--wow-text-muted)", fontSize: "0.875rem", marginTop: "0.5rem" }}>{event.description}</p>}
      </div>

      {/* Sign-up form (for members with characters) */}
      {userCharacters.length > 0 && event.status === "OPEN" && (
        <div style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)", borderRadius: "0.5rem", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <h2 style={{ color: "var(--wow-text)", fontWeight: 600, marginBottom: "0.75rem" }}>Your Sign-up</h2>
          <div className="flex gap-3 mb-3 flex-wrap">
            {userCharacters.length > 1 && (
              <select value={selectedChar} onChange={(e) => setSelectedChar(e.target.value)}
                style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none" }}>
                {userCharacters.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.class})</option>)}
              </select>
            )}
            {userCharacters.length === 1 && (
              <span style={{ color: "var(--wow-text)", fontSize: "0.875rem", alignSelf: "center" }}>{userCharacters[0].name} ({userCharacters[0].class})</span>
            )}
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note…"
              style={{ flex: 1, minWidth: "140px", background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none" }} />
          </div>
          <div className="flex gap-2">
            {(["ACCEPTED", "TENTATIVE", "DECLINED"] as SignupStatus[]).map((s) => {
              const btnStyle: React.CSSProperties = s === "ACCEPTED"
                ? { background: "rgba(64,200,100,0.12)", border: "1px solid rgba(64,200,100,0.4)", color: "#40c864" }
                : s === "TENTATIVE"
                ? { background: "rgba(var(--wow-primary-rgb),0.12)", border: "1px solid rgba(var(--wow-primary-rgb),0.4)", color: "var(--wow-gold)" }
                : { background: "rgba(200,64,64,0.12)", border: "1px solid rgba(200,64,64,0.4)", color: "#c84040" };
              return (
                <button key={s} disabled={submitting} onClick={() => submitSignup(s)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ ...btnStyle, opacity: submitting ? 0.5 : 1 }}>
                  {STATUS_ICON[s]} {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Signup list */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={activeTab === t
                ? { background: "rgba(var(--wow-primary-rgb),0.12)", border: "1px solid rgba(var(--wow-primary-rgb),0.4)", color: "var(--wow-gold-bright)" }
                : { color: "var(--wow-text-muted)" }}>
              {t === "ALL" ? `All (${signups.length})` : `${t.charAt(0)+t.slice(1).toLowerCase()} (${counts[t]})`}
            </button>
          ))}
        </div>
        <span style={{ fontSize: "0.75rem", color: "var(--wow-text-faint)" }}>{counts.ACCEPTED}/{event.maxAttendees} confirmed</span>
      </div>

      <div style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)", borderRadius: "0.5rem", overflow: "hidden" }}>
        {displayed.length === 0 ? (
          <p className="text-center py-8" style={{ color: "var(--wow-text-faint)", fontSize: "0.875rem" }}>No sign-ups yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(var(--wow-primary-rgb),0.15)", textAlign: "left", fontSize: "0.75rem", fontFamily: "inherit", color: "var(--wow-text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th className="px-4 py-3">Character</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((signup) => (
                <tr key={signup.id} style={{ borderBottom: "1px solid rgba(200,169,106,0.07)" }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(var(--wow-primary-rgb),0.04)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td className="px-4 py-3" style={{ color: "var(--wow-text)", fontSize: "0.875rem", fontWeight: 500 }}>{signup.character.name}</td>
                  <td className="px-4 py-3" style={{ color: "var(--wow-text-muted)", fontSize: "0.875rem" }}>{signup.character.role}</td>
                  <td className="px-4 py-3">
                    {isOfficer ? (
                      <select value={signup.status} onChange={(e) => officerUpdate(signup.id, e.target.value as SignupStatus)}
                        style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)", fontSize: "0.75rem", borderRadius: "0.25rem", padding: "0.25rem 0.5rem", outline: "none" }}>
                        <option value="ACCEPTED">✓ Accepted</option>
                        <option value="TENTATIVE">? Tentative</option>
                        <option value="DECLINED">✗ Declined</option>
                      </select>
                    ) : (
                      <span className="text-xs rounded-full px-2 py-0.5"
                        style={signup.status === "ACCEPTED"
                          ? { background: "rgba(64,200,100,0.12)", border: "1px solid rgba(64,200,100,0.4)", color: "#40c864" }
                          : signup.status === "TENTATIVE"
                          ? { background: "rgba(var(--wow-primary-rgb),0.12)", border: "1px solid rgba(var(--wow-primary-rgb),0.4)", color: "var(--wow-gold)" }
                          : { background: "rgba(200,64,64,0.12)", border: "1px solid rgba(200,64,64,0.4)", color: "#c84040" }}>
                        {STATUS_ICON[signup.status]} {signup.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--wow-text-faint)", fontSize: "0.875rem" }}>{signup.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
