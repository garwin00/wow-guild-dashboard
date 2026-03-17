"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type CharRole = "TANK" | "HEALER" | "DPS";
interface Character {
  id: string; name: string; realm: string; class: string; spec: string | null;
  role: CharRole; itemLevel: number | null; level: number | null; isMain: boolean; avatarUrl: string | null;
  guildRank: number | null; userId: string | null;
  vaultSlot1: number | null; vaultSlot2: number | null; vaultSlot3: number | null; vaultUpdatedAt: string | null;
}
interface MembershipInfo {
  id: string; role: string;
  trialStartDate: string | null; trialReviewDate: string | null;
}

const CLASS_COLOR_HEX: Record<string, string> = {
  "death knight": "#C41E3A",
  "demon hunter": "#A330C9",
  "druid":        "#FF7C0A",
  "evoker":       "#33937F",
  "hunter":       "#AAD372",
  "mage":         "#3FC7EB",
  "monk":         "#00FF98",
  "paladin":      "#F48CBA",
  "priest":       "#FFFFFF",
  "rogue":        "#FFF468",
  "shaman":       "#0070DD",
  "warlock":      "#8788EE",
  "warrior":      "#C69B3A",
};

function classColor(cls: string): string {
  return CLASS_COLOR_HEX[cls.toLowerCase()] ?? "#9ca3af";
}

function classColorBg(cls: string): string {
  const hex = CLASS_COLOR_HEX[cls.toLowerCase()];
  if (!hex) return "rgba(156,163,175,0.15)";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.15)`;
}

const ROLE_ICON: Record<CharRole, string> = { TANK: "🛡️", HEALER: "💚", DPS: "⚔️" };
const ROLE_LABEL: Record<CharRole, string> = { TANK: "Tanks", HEALER: "Healers", DPS: "DPS" };

function iLvlColor(ilvl: number | null): string {
  if (!ilvl) return "text-gray-500";
  if (ilvl >= 220) return "text-orange-400";
  if (ilvl >= 200) return "text-purple-400";
  if (ilvl >= 180) return "text-blue-400";
  if (ilvl >= 160) return "text-green-400";
  return "text-gray-400";
}

function attendanceColor(pct: number): string {
  if (pct >= 80) return "var(--wow-success)";
  if (pct >= 60) return "var(--wow-warning)";
  if (pct >= 40) return "var(--wow-warning)";
  return "var(--wow-error)";
}

export default function RosterClient({ guildSlug, isOfficer, guildName, currentUserId }: {
  guildSlug: string; isOfficer: boolean; guildName: string; currentUserId: string;
}) {
  const queryClient = useQueryClient();
  const [chars, setChars] = useState<Character[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [filter, setFilter] = useState<CharRole | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"rank" | "ilvl" | "name" | "attendance">("rank");
  const [cooldownUntil, setCooldownUntil] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem(`roster-sync-cooldown-${guildSlug}`) ?? "0", 10);
  });

  const [notePanel, setNotePanel] = useState<{ char: Character } | null>(null);
  const [notes, setNotes] = useState<{ id: string; content: string; createdAt: string; author: { name: string | null; email: string } }[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);

  // Trial tracking state
  const [trialStartDate, setTrialStartDate] = useState("");
  const [trialReviewDate, setTrialReviewDate] = useState("");
  const [trialSaving, setTrialSaving] = useState(false);
  const [trialMsg, setTrialMsg] = useState<string | null>(null);

  function exportCsv() {
    const headers = ["Name", "Class", "Spec", "Role", "Level", "iLvl", "Attendance%", "Vault1", "Vault2", "Vault3", "GuildRank"];
    const rows = filtered.map((c) => {
      const att = attendanceMap[c.id];
      const attPct = att?.total ? Math.round((att.attended / att.total) * 100) : "";
      return [
        c.name, c.class ?? "", c.spec ?? "", c.role ?? "", c.level ?? "", c.itemLevel ?? "",
        attPct, c.vaultSlot1 ?? "", c.vaultSlot2 ?? "", c.vaultSlot3 ?? "", c.guildRank ?? "",
      ].map(String);
    });
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${guildName}-roster.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const { data, isLoading } = useQuery<{
    guildId: string;
    characters: Character[];
    attendanceMap: Record<string, { attended: number; total: number }>;
    absencesByUser: Record<string, { startDate: string; endDate: string; reason: string | null }[]>;
    membershipMap: Record<string, MembershipInfo>;
  }>({
    queryKey: ["roster", guildSlug],
    queryFn: () => fetch(`/api/guild/${guildSlug}/roster`).then((r) => r.json()),
  });

  useEffect(() => {
    if (data?.characters) setChars(data.characters);
  }, [data]);

  const openNotePanel = useCallback(async (char: Character) => {
    if (!char.userId) return;
    setNotePanel({ char });
    setNotes([]);
    setNoteInput("");
    setTrialMsg(null);
    const mem = data?.membershipMap?.[char.userId];
    setTrialStartDate(mem?.trialStartDate ? mem.trialStartDate.slice(0, 10) : "");
    setTrialReviewDate(mem?.trialReviewDate ? mem.trialReviewDate.slice(0, 10) : "");
    setNoteLoading(true);
    const res = await fetch(`/api/officer-notes?guildSlug=${encodeURIComponent(guildSlug)}&targetUserId=${char.userId}`);
    if (res.ok) setNotes(await res.json());
    setNoteLoading(false);
  }, [guildSlug, data?.membershipMap]);

  async function addNote() {
    if (!notePanel?.char.userId || !noteInput.trim()) return;
    const res = await fetch("/api/officer-notes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guildSlug, targetUserId: notePanel.char.userId, content: noteInput.trim() }),
    });
    if (res.ok) {
      const note = await res.json();
      setNotes((prev) => [note, ...prev]);
      setNoteInput("");
    }
  }

  async function deleteNote(id: string) {
    await fetch(`/api/officer-notes?id=${id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  const COOLDOWN_MS = 15 * 60 * 1000;
  const cooldownRemaining = Math.max(0, cooldownUntil - Date.now());
  const cooldownMins = Math.ceil(cooldownRemaining / 60000);
  const onCooldown = cooldownRemaining > 0;

  async function syncRoster() {
    if (onCooldown) return;
    setSyncing(true); setSyncMsg("Syncing roster + fetching specs…");
    const res = await fetch("/api/roster/sync", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guildSlug }),
    });
    const d = await res.json();
    setSyncMsg(res.ok ? `✓ Synced ${d.synced} characters` : `Error: ${d.error}`);
    setSyncing(false);
    if (res.ok) {
      const until = Date.now() + COOLDOWN_MS;
      localStorage.setItem(`roster-sync-cooldown-${guildSlug}`, String(until));
      setCooldownUntil(until);
      queryClient.invalidateQueries({ queryKey: ["roster", guildSlug] });
    }
  }

  async function setRole(characterId: string, role: CharRole) {
    await fetch("/api/roster/role", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId, role, guildSlug }),
    });
    setChars((prev) => prev.map((c) => c.id === characterId ? { ...c, role } : c));
  }

  const attendanceMap = data?.attendanceMap ?? {};
  const absencesByUser = data?.absencesByUser ?? {};
  const membershipMap = data?.membershipMap ?? {};
  const guildId = data?.guildId ?? "";

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-sm" style={{ color: "var(--wow-text-faint)" }}>Loading…</span>
      </div>
    );
  }

  const filtered = chars
    .filter((c) => filter === "ALL" || c.role === filter)
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.class.toLowerCase().includes(search.toLowerCase()) || (c.spec ?? "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "rank") return (a.guildRank ?? 99) - (b.guildRank ?? 99) || a.name.localeCompare(b.name);
      if (sortBy === "ilvl") return (b.itemLevel ?? 0) - (a.itemLevel ?? 0);
      if (sortBy === "attendance") {
        const aPct = attendanceMap[a.id]?.total ? (attendanceMap[a.id].attended / attendanceMap[a.id].total) * 100 : -1;
        const bPct = attendanceMap[b.id]?.total ? (attendanceMap[b.id].attended / attendanceMap[b.id].total) * 100 : -1;
        return bPct - aPct;
      }
      return a.name.localeCompare(b.name);
    });

  const counts = {
    TANK: chars.filter(c => c.role === "TANK").length,
    HEALER: chars.filter(c => c.role === "HEALER").length,
    DPS: chars.filter(c => c.role === "DPS").length,
  };

  const avgIlvl = chars.filter(c => c.itemLevel).length > 0
    ? Math.round(chars.filter(c => c.itemLevel).reduce((s, c) => s + (c.itemLevel ?? 0), 0) / chars.filter(c => c.itemLevel).length)
    : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl wow-heading" style={{ color: "var(--wow-gold-bright)" }}>Roster</h1>
          <p className="text-sm mt-1" style={{ color: "var(--wow-text-muted)" }}>
            {chars.length} characters · {guildName}
            {avgIlvl && <span className={`ml-2 font-medium ${iLvlColor(avgIlvl)}`}>avg {avgIlvl} iLvl</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {syncMsg && <span className="text-sm" style={{ color: "var(--wow-text-muted)" }}>{syncMsg}</span>}
          <button onClick={exportCsv} className="wow-btn text-sm opacity-80 hover:opacity-100" title="Export roster as CSV">
            ↓ CSV
          </button>
          <button onClick={syncRoster} disabled={syncing || onCooldown}
            className="wow-btn"
            title={onCooldown ? `Available in ${cooldownMins}m` : "Sync roster from Blizzard"}>
            {syncing ? "Syncing…" : onCooldown ? `↻ Sync (${cooldownMins}m)` : "↻ Sync Roster"}
          </button>
        </div>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {(["TANK", "HEALER", "DPS"] as CharRole[]).map((r) => (
          <button key={r} onClick={() => setFilter(filter === r ? "ALL" : r)}
            className="wow-panel p-4 text-left transition-all"
            style={filter === r ? { background: "rgba(var(--wow-primary-rgb),0.12)", borderColor: "rgba(var(--wow-primary-rgb),0.5)" } : undefined}>
            <span className="text-xl">{ROLE_ICON[r]}</span>
            <p className="font-bold text-xl mt-1" style={{ color: "var(--wow-text)" }}>{counts[r]}</p>
            <p className="text-xs" style={{ color: "var(--wow-text-muted)" }}>{ROLE_LABEL[r]}</p>
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, class or spec…"
          className="max-w-xs wow-input" />
        <div className="flex gap-1 ml-auto">
          {(["rank", "ilvl", "name", "attendance"] as const).map((s) => (
            <button key={s} onClick={() => setSortBy(s)}
              className="px-3 py-1.5 rounded text-xs transition-all"
              style={{
                fontFamily: "inherit",
                letterSpacing: "0.04em",
                background: sortBy === s ? "rgba(var(--wow-primary-rgb),0.15)" : "transparent",
                color: sortBy === s ? "var(--wow-gold-bright)" : "var(--wow-text-faint)",
                border: sortBy === s ? "1px solid rgba(var(--wow-primary-rgb),0.3)" : "1px solid transparent",
              }}>
              {s === "rank" ? "Rank" : s === "ilvl" ? "iLvl" : s === "attendance" ? "Attendance" : "Name"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--wow-text-faint)" }}>
          {chars.length === 0
            ? isOfficer ? 'Click "Sync Roster" to import your guild.' : "No roster data yet."
            : "No characters match your search."}
        </div>
      ) : (
        <div className="wow-panel overflow-hidden">
          <table className="wow-table">
            <thead>
              <tr>
                <th className="px-4 py-3 w-10 text-center hidden sm:table-cell">Rank</th>
                <th className="px-4 py-3">Character</th>
                <th className="px-4 py-3 hidden md:table-cell">Class · Spec</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Level</th>
                <th className="px-4 py-3 text-right pr-8 hidden sm:table-cell">iLvl</th>
                <th className="px-4 py-3 text-center hidden xl:table-cell" title="Great Vault weekly M+ progress">Vault</th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">Attend.</th>
                <th className="px-4 py-3 pl-8">Role</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((char) => (
                <tr key={char.id}>
                  <td className="px-4 py-3 text-center text-xs tabular-nums hidden sm:table-cell" style={{ color: "var(--wow-text-faint)" }}>
                    {char.guildRank ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {char.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={char.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" style={{ boxShadow: `0 0 0 1px ${classColor(char.class)}40` }} />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: classColorBg(char.class), color: classColor(char.class) }}>
                          {char.name[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-sm" style={{ color: classColor(char.class) }}>{char.name}</p>
                          {char.userId && membershipMap[char.userId]?.role === "TRIALIST" && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)", color: "#fbbf24", letterSpacing: "0.05em" }}>
                              TRIAL
                            </span>
                          )}
                          {char.userId && absencesByUser[char.userId]?.length > 0 && (
                            <span title={`${absencesByUser[char.userId].length} absence notice(s)`} className="text-xs" style={{ color: "#ff8000" }}>🏖</span>
                          )}
                        </div>
                        <p className="text-xs md:hidden" style={{ color: classColor(char.class) }}>
                          {char.spec ? `${char.spec} ` : ""}{char.class}
                        </p>
                        <p className="text-xs hidden md:block" style={{ color: "var(--wow-text-faint)" }}>{char.realm.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm font-medium" style={{ color: classColor(char.class) }}>
                      {char.spec ? `${char.spec} ` : ""}{char.class && char.class !== "Unknown" ? char.class : <span className="italic" style={{ color: "var(--wow-text-faint)" }}>Unknown</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right tabular-nums hidden sm:table-cell" style={{ color: "var(--wow-text-muted)" }}>
                    {char.level ?? "—"}
                  </td>
                  <td className={`px-4 py-3 text-sm font-semibold text-right pr-8 tabular-nums hidden sm:table-cell ${iLvlColor(char.itemLevel)}`}>
                    {char.itemLevel ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center hidden xl:table-cell">
                    {char.vaultSlot1 !== null ? (
                      <div className="flex items-center justify-center gap-0.5" title={`Vault: ${char.vaultSlot2 ?? 0}/4 runs · Slot 1 ${char.vaultSlot1 >= 1 ? "✓" : "✗"} Slot 2 ${char.vaultSlot2 !== null && char.vaultSlot2 >= 4 ? "✓" : "✗"} Slot 3 ${char.vaultSlot3 !== null && char.vaultSlot3 >= 8 ? "✓" : "✗"}`}>
                        <span className="text-base" style={{ opacity: char.vaultSlot1 >= 1 ? 1 : 0.25 }}>🗝️</span>
                        <span className="text-base" style={{ opacity: char.vaultSlot2 !== null && char.vaultSlot2 >= 4 ? 1 : 0.25 }}>🗝️</span>
                        <span className="text-base" style={{ opacity: char.vaultSlot3 !== null && char.vaultSlot3 >= 8 ? 1 : 0.25 }}>🗝️</span>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    {(() => {
                      const att = attendanceMap[char.id];
                      if (!att || att.total === 0) return <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>—</span>;
                      const pct = Math.round((att.attended / att.total) * 100);
                      return (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs font-semibold tabular-nums" style={{ color: attendanceColor(pct) }}>{pct}%</span>
                          <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: "rgba(var(--wow-primary-rgb),0.1)" }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: attendanceColor(pct) }} />
                          </div>
                          <span className="text-[10px]" style={{ color: "var(--wow-text-faint)" }}>{att.attended}/{att.total}</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 pl-4 sm:pl-8">
                    <div className="flex items-center gap-2">
                      {isOfficer ? (
                        <select value={char.role} onChange={(e) => setRole(char.id, e.target.value as CharRole)}
                          className="wow-select text-xs" style={{ width: "auto", padding: "0.25rem 0.5rem" }}>
                          <option value="TANK">🛡️ Tank</option>
                          <option value="HEALER">💚 Healer</option>
                          <option value="DPS">⚔️ DPS</option>
                        </select>
                      ) : (
                        <span className="text-sm">{ROLE_ICON[char.role]}</span>
                      )}
                      {isOfficer && char.userId && (
                        <button onClick={() => openNotePanel(char)} title="Officer notes"
                          className="text-sm opacity-40 hover:opacity-100 transition-opacity">📝</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Officer Notes slide panel */}
      {notePanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1" onClick={() => setNotePanel(null)} style={{ background: "rgba(0,0,0,0.5)" }} />
          <div className="w-full max-w-sm flex flex-col" style={{ background: "var(--wow-bg)", borderLeft: "1px solid rgba(var(--wow-primary-rgb),0.2)" }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
              <div>
                <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: "var(--wow-text-faint)" }}>Officer Notes</p>
                <p className="font-semibold" style={{ color: classColor(notePanel.char.class) }}>{notePanel.char.name}</p>
              </div>
              <button onClick={() => setNotePanel(null)} className="text-lg opacity-60 hover:opacity-100" style={{ color: "var(--wow-text)" }}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {noteLoading ? (
                <p className="text-sm text-center py-8" style={{ color: "var(--wow-text-faint)" }}>Loading…</p>
              ) : notes.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: "var(--wow-text-faint)" }}>No notes yet.</p>
              ) : notes.map((n) => (
                <div key={n.id} className="wow-panel p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm flex-1" style={{ color: "var(--wow-text)" }}>{n.content}</p>
                    <button onClick={() => deleteNote(n.id)} className="text-xs opacity-40 hover:opacity-100 shrink-0" style={{ color: "var(--wow-error)" }}>✕</button>
                  </div>
                  <p className="text-[10px] mt-1.5" style={{ color: "var(--wow-text-faint)" }}>
                    {n.author.name ?? n.author.email} · {new Date(n.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
            <div className="p-4" style={{ borderTop: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
              {/* Trial tracking section — shown for TRIALIST members */}
              {notePanel.char.userId && membershipMap[notePanel.char.userId]?.role === "TRIALIST" && (() => {
                const mem = membershipMap[notePanel.char.userId!]!;
                async function saveTrialDates() {
                  setTrialSaving(true); setTrialMsg(null);
                  const res = await fetch("/api/roster/trial", {
                    method: "PATCH", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ membershipId: mem.id, guildSlug, trialStartDate: trialStartDate || undefined, trialReviewDate: trialReviewDate || undefined }),
                  });
                  setTrialMsg(res.ok ? "✓ Saved" : "Failed");
                  setTrialSaving(false);
                  if (res.ok) queryClient.invalidateQueries({ queryKey: ["roster", guildSlug] });
                }
                async function promoteMember() {
                  setTrialSaving(true); setTrialMsg(null);
                  const res = await fetch("/api/settings/role", {
                    method: "PATCH", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ membershipId: mem.id, role: "MEMBER", guildId }),
                  });
                  setTrialMsg(res.ok ? "✓ Promoted to Member" : "Failed");
                  setTrialSaving(false);
                  if (res.ok) queryClient.invalidateQueries({ queryKey: ["roster", guildSlug] });
                }
                async function clearTrial() {
                  setTrialSaving(true); setTrialMsg(null);
                  const res = await fetch("/api/roster/trial", {
                    method: "PATCH", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ membershipId: mem.id, guildSlug, clearTrial: true }),
                  });
                  setTrialMsg(res.ok ? "✓ Cleared" : "Failed");
                  if (res.ok) { setTrialStartDate(""); setTrialReviewDate(""); }
                  setTrialSaving(false);
                  if (res.ok) queryClient.invalidateQueries({ queryKey: ["roster", guildSlug] });
                }
                return (
                  <div className="mb-4 space-y-3 pb-4" style={{ borderBottom: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
                    <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#fbbf24" }}>⚗ Trial Tracking</p>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--wow-text-faint)" }}>Trial Started</label>
                        <input type="date" value={trialStartDate} onChange={e => setTrialStartDate(e.target.value)} className="wow-input w-full text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--wow-text-faint)" }}>Review Date</label>
                        <input type="date" value={trialReviewDate} onChange={e => setTrialReviewDate(e.target.value)} className="wow-input w-full text-sm" />
                      </div>
                    </div>
                    {trialMsg && <p className="text-xs" style={{ color: trialMsg.startsWith("✓") ? "var(--wow-success)" : "var(--wow-error)" }}>{trialMsg}</p>}
                    <div className="flex flex-col gap-1.5">
                      <button onClick={saveTrialDates} disabled={trialSaving} className="wow-btn text-xs w-full" style={{ opacity: trialSaving ? 0.5 : 1 }}>Save Trial Dates</button>
                      <button onClick={promoteMember} disabled={trialSaving} className="text-xs px-3 py-1.5 rounded-lg w-full transition-colors"
                        style={{ background: "rgba(64,200,100,0.12)", border: "1px solid rgba(64,200,100,0.35)", color: "#40c864", opacity: trialSaving ? 0.5 : 1 }}>
                        ✓ Promote to Member
                      </button>
                      <button onClick={clearTrial} disabled={trialSaving} className="text-xs px-3 py-1.5 rounded-lg w-full transition-colors"
                        style={{ background: "rgba(200,64,64,0.08)", border: "1px solid rgba(200,64,64,0.25)", color: "#c84040", opacity: trialSaving ? 0.5 : 1 }}>
                        ✕ Clear Trial
                      </button>
                    </div>
                  </div>
                );
              })()}
              <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} rows={3}
                placeholder="Add a note… (officer-only, not visible to member)"
                className="wow-input resize-none" />
              <button onClick={addNote} disabled={!noteInput.trim()} className="wow-btn w-full mt-2" style={{ opacity: noteInput.trim() ? 1 : 0.4 }}>Add Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
