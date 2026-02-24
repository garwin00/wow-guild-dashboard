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
        <p className="text-gray-400 text-sm mb-1">{event.raidZone}</p>
        <h1 className="text-3xl font-bold text-white">{event.title}</h1>
        <p className="text-gray-400 mt-1">
          {date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} at {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </p>
        {event.description && <p className="text-gray-400 text-sm mt-2">{event.description}</p>}
      </div>

      {/* Sign-up form (for members with characters) */}
      {userCharacters.length > 0 && event.status === "OPEN" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-white font-semibold mb-3">Your Sign-up</h2>
          <div className="flex gap-3 mb-3 flex-wrap">
            {userCharacters.length > 1 && (
              <select value={selectedChar} onChange={(e) => setSelectedChar(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
                {userCharacters.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.class})</option>)}
              </select>
            )}
            {userCharacters.length === 1 && (
              <span className="text-gray-300 text-sm self-center">{userCharacters[0].name} ({userCharacters[0].class})</span>
            )}
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note…"
              className="flex-1 min-w-[140px] bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="flex gap-2">
            {(["ACCEPTED", "TENTATIVE", "DECLINED"] as SignupStatus[]).map((s) => (
              <button key={s} disabled={submitting} onClick={() => submitSignup(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${STATUS_COLORS[s]}`}>
                {STATUS_ICON[s]} {s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Signup list */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === t ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"}`}>
              {t === "ALL" ? `All (${signups.length})` : `${t.charAt(0)+t.slice(1).toLowerCase()} (${counts[t]})`}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">{counts.ACCEPTED}/{event.maxAttendees} confirmed</span>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {displayed.length === 0 ? (
          <p className="text-center py-8 text-gray-600 text-sm">No sign-ups yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Character</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((signup) => (
                <tr key={signup.id} className="border-b border-gray-800/50">
                  <td className="px-4 py-3 text-white text-sm font-medium">{signup.character.name}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{signup.character.role}</td>
                  <td className="px-4 py-3">
                    {isOfficer ? (
                      <select value={signup.status} onChange={(e) => officerUpdate(signup.id, e.target.value as SignupStatus)}
                        className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1 focus:outline-none">
                        <option value="ACCEPTED">✓ Accepted</option>
                        <option value="TENTATIVE">? Tentative</option>
                        <option value="DECLINED">✗ Declined</option>
                      </select>
                    ) : (
                      <span className={`text-xs border rounded-full px-2 py-0.5 ${STATUS_COLORS[signup.status]}`}>
                        {STATUS_ICON[signup.status]} {signup.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{signup.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
