"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { classColor } from "@/lib/wow-constants";
import CompositionPanel from "./CompositionPanel";

type EventStatus = "OPEN" | "CLOSED" | "CANCELLED";
type SignupStatus = "ACCEPTED" | "TENTATIVE" | "DECLINED";
interface RaidEvent { id: string; title: string; raidZone: string; scheduledAt: string | Date; maxAttendees: number; minItemLevel: number | null; status: EventStatus; description: string | null; _count: { signups: number }; }
interface Character { id: string; name: string; class: string; spec: string | null; role: string; itemLevel: number | null; }
interface UserCharacter { id: string; name: string; class: string; }
interface Signup { id: string; status: SignupStatus; note: string | null; character: Character; }

const STATUS_ICON: Record<SignupStatus, string> = { ACCEPTED: "✓", TENTATIVE: "?", DECLINED: "✗" };

function ReadinessBadge({ ilvl, min }: { ilvl: number | null; min: number }) {
  if (!ilvl) return <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>—</span>;
  const diff = ilvl - min;
  if (diff >= 0) return <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--wow-success)" }}>✓ {ilvl}</span>;
  if (diff >= -5) return <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--wow-warning)" }}>⚠ {ilvl}</span>;
  return <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--wow-error)" }}>✗ {ilvl}</span>;
}

export default function RaidsClient({ guildSlug, isOfficer }: {
  guildSlug: string; isOfficer: boolean;
}) {
  const [events, setEvents] = useState<RaidEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [signups, setSignups] = useState<Signup[] | null>(null);
  const [loadingSignups, setLoadingSignups] = useState(false);
  const [mainTab, setMainTab] = useState<"signups" | "composition">("signups");
  const [filterTab, setFilterTab] = useState<SignupStatus | "ALL">("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", raidZone: "", scheduledAt: "", maxAttendees: "25", minItemLevel: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [selectedChar, setSelectedChar] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const firstLoad = useRef(false);

  const { data, isLoading } = useQuery<{ events: RaidEvent[]; userCharacters: UserCharacter[] }>({
    queryKey: ["raids", guildSlug],
    queryFn: () => fetch(`/api/guild/${guildSlug}/raids`).then(r => r.json()),
  });

  useEffect(() => {
    if (data && !firstLoad.current) {
      firstLoad.current = true;
      setEvents(data.events ?? []);
      const first = (data.events ?? []).find(e => new Date(e.scheduledAt) >= new Date() && e.status !== "CANCELLED")?.id ?? (data.events ?? [])[0]?.id ?? null;
      setSelectedId(first);
      setSelectedChar((data.userCharacters ?? [])[0]?.id ?? "");
    }
  }, [data]);

  const userCharacters = data?.userCharacters ?? [];
  const selectedEvent = events.find(e => e.id === selectedId) ?? null;

  const loadSignups = useCallback(async (id: string) => {
    setLoadingSignups(true);
    setSignups(null);
    const res = await fetch(`/api/raids/${id}/signups`);
    if (res.ok) setSignups(await res.json());
    setLoadingSignups(false);
  }, []);

  useEffect(() => {
    if (selectedId) loadSignups(selectedId);
  }, [selectedId, loadSignups]);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/raids/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, maxAttendees: parseInt(form.maxAttendees), minItemLevel: form.minItemLevel ? parseInt(form.minItemLevel) : null, guildSlug }),
    });
    const d = await res.json();
    if (res.ok) {
      const newEvent = { ...d, _count: { signups: 0 } };
      setEvents(prev => [...prev, newEvent].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()));
      setSelectedId(newEvent.id);
      setShowCreate(false);
      setForm({ title: "", raidZone: "", scheduledAt: "", maxAttendees: "25", minItemLevel: "", description: "" });
    }
    setSaving(false);
  }

  async function submitSignup(status: SignupStatus) {
    if (!selectedChar || !selectedId) return;
    setSubmitting(true);
    const res = await fetch("/api/raids/signup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raidEventId: selectedId, characterId: selectedChar, status, note }),
    });
    const d = await res.json();
    if (res.ok) {
      const char = userCharacters.find(c => c.id === selectedChar)!;
      const full: Signup = { ...d, character: { ...char, spec: null, role: d.character?.role ?? "DPS", itemLevel: d.character?.itemLevel ?? null } };
      setSignups(prev => {
        if (!prev) return [full];
        const idx = prev.findIndex(s => s.character.id === selectedChar);
        return idx >= 0 ? prev.map((s, i) => i === idx ? full : s) : [...prev, full];
      });
      setEvents(prev => prev.map(e => e.id === selectedId ? { ...e, _count: { signups: e._count.signups + (res.status === 201 ? 1 : 0) } } : e));
    }
    setSubmitting(false);
  }

  async function officerUpdate(signupId: string, status: SignupStatus) {
    await fetch("/api/raids/signup", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signupId, status, guildSlug }),
    });
    setSignups(prev => prev ? prev.map(s => s.id === signupId ? { ...s, status } : s) : prev);
  }

  if (isLoading && events.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center py-24">
        <span className="text-sm" style={{ color: "var(--wow-text-faint)" }}>Loading…</span>
      </div>
    );
  }

  const upcoming = events.filter(e => new Date(e.scheduledAt) >= new Date() && e.status !== "CANCELLED");
  const past = events.filter(e => new Date(e.scheduledAt) < new Date() || e.status === "CANCELLED");
  const counts = signups ? {
    ACCEPTED: signups.filter(s => s.status === "ACCEPTED").length,
    TENTATIVE: signups.filter(s => s.status === "TENTATIVE").length,
    DECLINED: signups.filter(s => s.status === "DECLINED").length,
  } : { ACCEPTED: 0, TENTATIVE: 0, DECLINED: 0 };
  const displayed = !signups ? [] : filterTab === "ALL" ? signups : signups.filter(s => s.status === filterTab);

  const statusStyle: Record<EventStatus, React.CSSProperties> = {
    OPEN: { background: "rgba(64,200,100,0.12)", border: "1px solid rgba(64,200,100,0.4)", color: "#40c864" },
    CLOSED: { background: "rgba(var(--wow-primary-rgb),0.08)", border: "1px solid rgba(var(--wow-primary-rgb),0.25)", color: "var(--wow-text-muted)" },
    CANCELLED: { background: "rgba(200,64,64,0.12)", border: "1px solid rgba(200,64,64,0.4)", color: "#c84040" },
  };

  function RaidListItem({ event }: { event: RaidEvent }) {
    const date = new Date(event.scheduledAt);
    const isSelected = event.id === selectedId;
    const fill = Math.min(Math.round((event._count.signups / event.maxAttendees) * 100), 100);
    return (
      <button onClick={() => { setSelectedId(event.id); setFilterTab("ALL"); setMainTab("signups"); }}
        className={`w-full text-left px-4 py-3 rounded-lg transition-colors${isSelected ? " wow-panel" : ""}`}
        style={!isSelected ? { border: "1px solid transparent" } : undefined}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-sm" style={{ color: isSelected ? "var(--wow-gold-bright)" : "var(--wow-text)" }}>{event.title}</p>
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--wow-text-muted)" }}>
              {date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <span className="text-xs rounded-full px-2 py-0.5 shrink-0" style={statusStyle[event.status]}>{event.status}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 rounded-full h-1" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-1 rounded-full" style={{ width: `${fill}%`, background: "var(--wow-gold)" }} />
          </div>
          <span className="text-xs tabular-nums" style={{ color: "var(--wow-text-faint)" }}>{event._count.signups}/{event.maxAttendees}</span>
        </div>
      </button>
    );
  }

  return (
    <div className="flex h-full min-h-0" style={{ height: "calc(100vh - 64px)" }}>
      {/* Left panel — raid list */}
      <div className="flex flex-col shrink-0 overflow-y-auto" style={{ width: "280px", borderRight: "1px solid rgba(var(--wow-primary-rgb),0.15)", padding: "1.5rem 0.75rem" }}>
        <div className="flex items-center justify-between px-2 mb-4">
          <h1 className="wow-heading font-bold text-xl" style={{ color: "var(--wow-gold-bright)" }}>Raids</h1>
          {isOfficer && (
            <button onClick={() => setShowCreate(!showCreate)} className="text-xs px-2.5 py-1 rounded-lg transition-colors"
              style={{ background: "rgba(var(--wow-primary-rgb),0.1)", border: "1px solid rgba(var(--wow-primary-rgb),0.3)", color: "var(--wow-gold)" }}>
              + New
            </button>
          )}
        </div>

        {upcoming.length > 0 && (
          <>
            <p className="px-2 mb-1 wow-section-label">Upcoming</p>
            <div className="space-y-0.5 mb-4">
              {upcoming.map(e => <RaidListItem key={e.id} event={e} />)}
            </div>
          </>
        )}
        {past.length > 0 && (
          <>
            <p className="px-2 mb-1 wow-section-label">Past</p>
            <div className="space-y-0.5 opacity-55">
              {past.map(e => <RaidListItem key={e.id} event={e} />)}
            </div>
          </>
        )}
        {events.length === 0 && (
          <p className="px-2 text-sm" style={{ color: "var(--wow-text-faint)" }}>No raids yet.</p>
        )}
      </div>

      {/* Right panel — detail */}
      <div className="wow-page flex-1 overflow-y-auto">
        {/* Create form (inline at top of right panel) */}
        {showCreate && (
          <form onSubmit={createEvent} className="wow-panel space-y-4" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
            <h2 style={{ color: "var(--wow-text)", fontWeight: 600 }}>New Raid Event</h2>
            <div className="grid grid-cols-2 gap-4">
              {[["Title", "title", "e.g. Nerub-ar Palace Heroic", "text"], ["Raid Zone", "raidZone", "e.g. Nerub-ar Palace", "text"],
                ["Date & Time", "scheduledAt", "", "datetime-local"], ["Max Attendees", "maxAttendees", "", "number"],
                ["Min iLvl (optional)", "minItemLevel", "e.g. 619", "number"]].map(([label, field, placeholder, type]) => (
                <div key={field as string}>
                  <label className="block text-xs mb-1" style={{ color: "var(--wow-text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
                  <input required={["title", "raidZone", "scheduledAt"].includes(field as string)} type={type as string}
                    value={form[field as keyof typeof form]} onChange={e => setForm({ ...form, [field as string]: e.target.value })}
                    placeholder={placeholder as string}
                    className="wow-input w-full" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--wow-text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Description (optional)</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                className="wow-input w-full" style={{ resize: "none" }} />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="wow-btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="wow-btn" style={{ opacity: saving ? 0.5 : 1 }}>{saving ? "Creating…" : "Create"}</button>
            </div>
          </form>
        )}

        {!selectedEvent ? (
          <div className="flex items-center justify-center h-64">
            <p style={{ color: "var(--wow-text-faint)" }}>Select a raid from the list.</p>
          </div>
        ) : (
          <>
            {/* Raid header */}
            <div className="mb-6">
              <p className="wow-section-label mb-1" style={{ color: "var(--wow-text-muted)" }}>{selectedEvent.raidZone}</p>
              <div className="flex items-center gap-3">
                <h2 className="wow-heading text-2xl font-bold" style={{ color: "var(--wow-gold-bright)" }}>{selectedEvent.title}</h2>
                <span className="text-xs rounded-full px-2.5 py-0.5" style={statusStyle[selectedEvent.status]}>{selectedEvent.status}</span>
              </div>
              <p className="text-sm mt-1" style={{ color: "var(--wow-text-muted)" }}>
                {new Date(selectedEvent.scheduledAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} at {new Date(selectedEvent.scheduledAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </p>
              {selectedEvent.description && <p className="text-sm" style={{ color: "var(--wow-text-muted)", marginTop: "0.4rem" }}>{selectedEvent.description}</p>}
              {selectedEvent.minItemLevel && signups && (() => {
                const accepted = signups.filter(s => s.status === "ACCEPTED");
                const ready = accepted.filter(s => (s.character.itemLevel ?? 0) >= selectedEvent.minItemLevel!).length;
                const readyPct = accepted.length ? Math.round((ready / accepted.length) * 100) : 0;
                return (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                    style={{ background: "rgba(var(--wow-primary-rgb),0.08)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)" }}>
                    <span style={{ color: "var(--wow-text-faint)" }}>Min iLvl: <span style={{ color: "var(--wow-gold)" }}>{selectedEvent.minItemLevel}</span></span>
                    <span style={{ color: "var(--wow-text-faint)" }}>·</span>
                    <span style={{ color: readyPct === 100 ? "var(--wow-success)" : readyPct >= 80 ? "var(--wow-warning)" : "var(--wow-error)" }}>{ready}/{accepted.length} ready ({readyPct}%)</span>
                  </div>
                );
              })()}
            </div>

            {/* Sign-up form */}
            {userCharacters.length > 0 && selectedEvent.status === "OPEN" && (
              <div className="wow-panel" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
                <h3 style={{ color: "var(--wow-text)", fontWeight: 600, marginBottom: "0.75rem" }}>Your Sign-up</h3>
                <div className="flex gap-3 mb-3 flex-wrap">
                  {userCharacters.length > 1 ? (
                    <select value={selectedChar} onChange={e => setSelectedChar(e.target.value)}
                      className="wow-input">
                      {userCharacters.map(c => <option key={c.id} value={c.id}>{c.name} ({c.class})</option>)}
                    </select>
                  ) : (
                    <span className="text-sm self-center" style={{ color: "var(--wow-text)" }}>{userCharacters[0].name} ({userCharacters[0].class})</span>
                  )}
                  <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note…"
                    className="wow-input" style={{ flex: 1, minWidth: "140px" }} />
                </div>
                <div className="flex gap-2">
                  {(["ACCEPTED", "TENTATIVE", "DECLINED"] as SignupStatus[]).map(s => {
                    const st: React.CSSProperties = s === "ACCEPTED"
                      ? { background: "rgba(64,200,100,0.12)", border: "1px solid rgba(64,200,100,0.4)", color: "#40c864" }
                      : s === "TENTATIVE"
                      ? { background: "rgba(var(--wow-primary-rgb),0.12)", border: "1px solid rgba(var(--wow-primary-rgb),0.4)", color: "var(--wow-gold)" }
                      : { background: "rgba(200,64,64,0.12)", border: "1px solid rgba(200,64,64,0.4)", color: "#c84040" };
                    return (
                      <button key={s} disabled={submitting} onClick={() => submitSignup(s)}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{ ...st, opacity: submitting ? 0.5 : 1 }}>
                        {STATUS_ICON[s]} {s.charAt(0) + s.slice(1).toLowerCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Main tabs */}
            <div className="flex gap-1 mb-5">
              <button onClick={() => setMainTab("signups")} className={`wow-tab${mainTab === "signups" ? " wow-tab-active" : ""}`}>
                Sign-ups {signups && <span className="text-xs" style={{ opacity: 0.65 }}>({signups.length})</span>}
              </button>
              <button onClick={() => setMainTab("composition")} className={`wow-tab${mainTab === "composition" ? " wow-tab-active" : ""}`}>
                Composition {signups && <span className="text-xs" style={{ opacity: 0.65 }}>({counts.ACCEPTED} confirmed)</span>}
              </button>
            </div>

            {loadingSignups && (
              <p className="text-sm" style={{ color: "var(--wow-text-faint)" }}>Loading…</p>
            )}

            {!loadingSignups && signups && mainTab === "signups" && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-1">
                    {(["ALL", "ACCEPTED", "TENTATIVE", "DECLINED"] as (SignupStatus | "ALL")[]).map(t => (
                      <button key={t} onClick={() => setFilterTab(t)} className={`wow-tab${filterTab === t ? " wow-tab-active" : ""}`}>
                        {t === "ALL" ? `All (${signups.length})` : `${t.charAt(0)+t.slice(1).toLowerCase()} (${counts[t]})`}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>{counts.ACCEPTED}/{selectedEvent.maxAttendees} confirmed</span>
                </div>
                <div className="wow-panel" style={{ overflow: "hidden" }}>
                  {displayed.length === 0 ? (
                    <p className="text-center py-8 text-sm" style={{ color: "var(--wow-text-faint)" }}>No sign-ups yet.</p>
                  ) : (
                    <table className="wow-table w-full">
                      <thead>
                        <tr style={{ textAlign: "left", color: "var(--wow-text-faint)" }}>
                          <th className="px-4 py-3">Character</th>
                          <th className="px-4 py-3">Role</th>
                          {selectedEvent.minItemLevel && <th className="px-4 py-3 text-right">iLvl</th>}
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayed.map(signup => (
                          <tr key={signup.id}>
                            <td className="px-4 py-3 font-medium">
                              <span style={{ color: classColor(signup.character.class) }}>{signup.character.name}</span>
                            </td>
                            <td className="px-4 py-3" style={{ color: "var(--wow-text-muted)" }}>{signup.character.role}</td>
                            {selectedEvent.minItemLevel && (
                              <td className="px-4 py-3 text-right"><ReadinessBadge ilvl={signup.character.itemLevel} min={selectedEvent.minItemLevel} /></td>
                            )}
                            <td className="px-4 py-3">
                              {isOfficer ? (
                                <select value={signup.status} onChange={e => officerUpdate(signup.id, e.target.value as SignupStatus)}
                                  className="wow-input">
                                  <option value="ACCEPTED">✓ Accepted</option>
                                  <option value="TENTATIVE">? Tentative</option>
                                  <option value="DECLINED">✗ Declined</option>
                                </select>
                              ) : (
                                <span className={`wow-badge wow-badge--${signup.status === "ACCEPTED" ? "success" : signup.status === "TENTATIVE" ? "info" : "error"}`}>
                                  {STATUS_ICON[signup.status]} {signup.status}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3" style={{ color: "var(--wow-text-faint)" }}>{signup.note ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {!loadingSignups && signups && mainTab === "composition" && (
              <CompositionPanel signups={signups} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
