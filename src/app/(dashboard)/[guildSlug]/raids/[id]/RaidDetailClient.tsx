"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { classColor } from "@/lib/wow-constants";
import CompositionPanel from "../CompositionPanel";

type SignupStatus = "ACCEPTED" | "TENTATIVE" | "DECLINED";
interface Character { id: string; name: string; class: string; spec: string | null; role: string; itemLevel: number | null; }
interface Signup { id: string; status: SignupStatus; note: string | null; character: Character; }
interface RaidEvent { id: string; title: string; raidZone: string; scheduledAt: string | Date; maxAttendees: number; minItemLevel: number | null; status: string; description: string | null; _count: { signups: number }; }

function ReadinessBadge({ ilvl, min }: { ilvl: number | null; min: number }) {
  if (!ilvl) return <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>—</span>;
  const diff = ilvl - min;
  if (diff >= 0) return <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--wow-success)" }}>✓ {ilvl}</span>;
  if (diff >= -5) return <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--wow-warning)" }}>⚠ {ilvl}</span>;
  return <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--wow-error)" }}>✗ {ilvl}</span>;
}

const STATUS_ICON: Record<SignupStatus, string> = { ACCEPTED: "✓", TENTATIVE: "?", DECLINED: "✗" };

export default function RaidDetailClient({ event, signups: initial, guildSlug, isOfficer, userCharacters, userId }: {
  event: RaidEvent; signups: Signup[]; guildSlug: string; isOfficer: boolean; userCharacters: Character[]; userId: string;
}) {
  const [signups, setSignups] = useState(initial);
  const [selectedChar, setSelectedChar] = useState(userCharacters[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<SignupStatus | "ALL">("ALL");
  const [mainTab, setMainTab] = useState<"signups" | "composition" | "cooldowns">("signups");

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
  const filterTabs: (SignupStatus | "ALL")[] = ["ALL", "ACCEPTED", "TENTATIVE", "DECLINED"];
  const counts = { ACCEPTED: signups.filter(s => s.status === "ACCEPTED").length, TENTATIVE: signups.filter(s => s.status === "TENTATIVE").length, DECLINED: signups.filter(s => s.status === "DECLINED").length };
  const displayed = activeTab === "ALL" ? signups : signups.filter(s => s.status === activeTab);


  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <p className="wow-section-label mb-1" style={{ color: "var(--wow-text-muted)" }}>{event.raidZone}</p>
        <h1 className="wow-heading text-3xl font-bold" style={{ color: "var(--wow-gold-bright)" }}>{event.title}</h1>
        <p style={{ color: "var(--wow-text-muted)", marginTop: "0.25rem" }}>
          {date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} at {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </p>
        {event.description && <p className="text-sm mt-2" style={{ color: "var(--wow-text-muted)" }}>{event.description}</p>}
        {event.minItemLevel && (() => {
          const accepted = signups.filter(s => s.status === "ACCEPTED");
          const ready = accepted.filter(s => (s.character.itemLevel ?? 0) >= event.minItemLevel!).length;
          const readyPct = accepted.length ? Math.round((ready / accepted.length) * 100) : 0;
          return (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              style={{ background: "rgba(var(--wow-primary-rgb),0.08)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)" }}>
              <span style={{ color: "var(--wow-text-faint)" }}>Min iLvl: <span style={{ color: "var(--wow-gold)" }}>{event.minItemLevel}</span></span>
              <span style={{ color: "var(--wow-text-faint)" }}>·</span>
              <span style={{ color: readyPct === 100 ? "var(--wow-success)" : readyPct >= 80 ? "var(--wow-warning)" : "var(--wow-error)" }}>
                {ready}/{accepted.length} ready ({readyPct}%)
              </span>
            </div>
          );
        })()}
      </div>

      {/* Top-level tabs */}
      <div className="flex gap-1 mb-5">
        <button onClick={() => setMainTab("signups")} className={`wow-tab${mainTab === "signups" ? " wow-tab-active" : ""}`}>
          Sign-ups <span className="text-xs" style={{ opacity: 0.7 }}>({signups.length})</span>
        </button>
        <button onClick={() => setMainTab("composition")} className={`wow-tab${mainTab === "composition" ? " wow-tab-active" : ""}`}>
          Composition <span className="text-xs" style={{ opacity: 0.7 }}>({counts.ACCEPTED} confirmed)</span>
        </button>
        <button onClick={() => setMainTab("cooldowns")} className={`wow-tab${mainTab === "cooldowns" ? " wow-tab-active" : ""}`}>
          Cooldowns
        </button>
      </div>

      {/* Sign-ups tab */}
      {mainTab === "signups" && (
        <>
          {/* Sign-up form (for members with characters) */}
          {userCharacters.length > 0 && event.status === "OPEN" && (
            <div className="wow-panel p-5 mb-6">
              <h2 style={{ color: "var(--wow-text)", fontWeight: 600, marginBottom: "0.75rem" }}>Your Sign-up</h2>
              <div className="flex gap-3 mb-3 flex-wrap">
                {userCharacters.length > 1 && (
                  <select value={selectedChar} onChange={(e) => setSelectedChar(e.target.value)}
                    className="wow-select" style={{ width: "auto" }}>
                    {userCharacters.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.class})</option>)}
                  </select>
                )}
                {userCharacters.length === 1 && (
                  <span className="text-sm self-center" style={{ color: "var(--wow-text)" }}>{userCharacters[0].name} ({userCharacters[0].class})</span>
                )}
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note…"
                  className="wow-input" style={{ flex: 1, minWidth: "140px", width: "auto" }} />
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

          {/* Filter sub-tabs + list */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {filterTabs.map((t) => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`wow-tab${activeTab === t ? " wow-tab-active" : ""}`}>
                  {t === "ALL" ? `All (${signups.length})` : `${t.charAt(0)+t.slice(1).toLowerCase()} (${counts[t]})`}
                </button>
              ))}
            </div>
            <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>{counts.ACCEPTED}/{event.maxAttendees} confirmed</span>
          </div>

          <div className="wow-panel overflow-hidden">
            {displayed.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: "var(--wow-text-faint)" }}>No sign-ups yet.</p>
            ) : (
              <table className="wow-table">
                <thead>
                  <tr>
                    <th className="px-4 py-3">Character</th>
                    <th className="px-4 py-3">Role</th>
                    {event.minItemLevel && <th className="px-4 py-3 text-right">iLvl</th>}
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((signup) => (
                    <tr key={signup.id}>
                      <td className="px-4 py-3 font-medium">
                        <span style={{ color: classColor(signup.character.class) }}>{signup.character.name}</span>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--wow-text-muted)" }}>{signup.character.role}</td>
                      {event.minItemLevel && (
                        <td className="px-4 py-3 text-right">
                          <ReadinessBadge ilvl={signup.character.itemLevel} min={event.minItemLevel} />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {isOfficer ? (
                          <select value={signup.status} onChange={(e) => officerUpdate(signup.id, e.target.value as SignupStatus)}
                            className="wow-select text-xs" style={{ width: "auto", padding: "0.25rem 0.5rem" }}>
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

      {/* Composition tab */}
      {mainTab === "composition" && <CompositionPanel signups={signups} />}

      {/* Cooldowns tab */}
      {mainTab === "cooldowns" && (
        <CooldownsPanel raidId={event.id} isOfficer={isOfficer} signups={signups} />
      )}
    </div>
  );
}

// ── Cooldowns Panel ─────────────────────────────────────────────────────────

interface CooldownAssignment {
  id: string;
  bossName: string;
  pullNumber: number;
  cooldownName: string;
  targetNote: string | null;
  character: { name: string; class: string };
}

function CooldownsPanel({
  raidId, isOfficer, signups,
}: {
  raidId: string;
  isOfficer: boolean;
  signups: Signup[];
}) {
  const qc = useQueryClient();
  const [newBoss, setNewBoss] = useState("");
  const [newPull, setNewPull] = useState(1);
  const [newCharId, setNewCharId] = useState(signups[0]?.character.id ?? "");
  const [newCd, setNewCd] = useState("");
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<{ assignments: CooldownAssignment[] }>({
    queryKey: ["cooldowns", raidId],
    queryFn: () => fetch(`/api/raids/${raidId}/cooldowns`).then(r => r.json()),
  });

  const addMutation = useMutation({
    mutationFn: (body: object) =>
      fetch(`/api/raids/${raidId}/cooldowns`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cooldowns", raidId] }); setAdding(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/raids/${raidId}/cooldowns/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cooldowns", raidId] }),
  });

  const exportText = useCallback(async () => {
    const res = await fetch(`/api/raids/${raidId}/cooldowns?export=text`);
    const text = await res.text();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [raidId]);

  const assignments = data?.assignments ?? [];

  // Group by boss / pull
  const groups = new Map<string, CooldownAssignment[]>();
  for (const a of assignments) {
    const key = `${a.bossName} (Pull ${a.pullNumber})`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  const accepted = signups.filter(s => s.status === "ACCEPTED");

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--wow-gold)" }}>
          Cooldown Assignments
        </h2>
        <div className="flex gap-2">
          {isOfficer && (
            <button onClick={() => setAdding(v => !v)} className="wow-btn text-xs">
              {adding ? "Cancel" : "+ Add Assignment"}
            </button>
          )}
          <button onClick={exportText} className="wow-btn text-xs opacity-80">
            {copied ? "✓ Copied!" : "Export for Discord"}
          </button>
        </div>
      </div>

      {/* Add form */}
      {adding && isOfficer && (
        <div className="rounded-lg p-4 space-y-3"
          style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)" }}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "var(--wow-text-faint)" }}>Boss</label>
              <input value={newBoss} onChange={e => setNewBoss(e.target.value)} placeholder="Fyrakk"
                className="w-full rounded px-2 py-1.5 text-sm outline-none"
                style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)" }} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "var(--wow-text-faint)" }}>Pull #</label>
              <input type="number" value={newPull} onChange={e => setNewPull(Number(e.target.value))} min={1}
                className="w-full rounded px-2 py-1.5 text-sm outline-none"
                style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)" }} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "var(--wow-text-faint)" }}>Character</label>
              <select value={newCharId} onChange={e => setNewCharId(e.target.value)}
                className="w-full rounded px-2 py-1.5 text-sm outline-none"
                style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)" }}>
                {accepted.map(s => (
                  <option key={s.character.id} value={s.character.id}>{s.character.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "var(--wow-text-faint)" }}>Cooldown</label>
              <input value={newCd} onChange={e => setNewCd(e.target.value)} placeholder="Rallying Cry"
                className="w-full rounded px-2 py-1.5 text-sm outline-none"
                style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)" }} />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "var(--wow-text-faint)" }}>Note (optional)</label>
            <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Use on P2 transition"
              className="w-full rounded px-2 py-1.5 text-sm outline-none"
              style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)" }} />
          </div>
          <button
            onClick={() => addMutation.mutate({ bossName: newBoss, pullNumber: newPull, characterId: newCharId, cooldownName: newCd, targetNote: newNote || null })}
            disabled={addMutation.isPending || !newBoss || !newCharId || !newCd}
            className="wow-btn text-sm">
            {addMutation.isPending ? "Adding…" : "Add Assignment"}
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm py-4" style={{ color: "var(--wow-text-faint)" }}>Loading…</p>
      ) : assignments.length === 0 ? (
        <p className="text-sm py-4" style={{ color: "var(--wow-text-faint)" }}>No cooldown assignments yet.</p>
      ) : (
        <div className="space-y-4">
          {[...groups.entries()].map(([groupKey, rows]) => (
            <div key={groupKey}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--wow-gold)" }}>
                {groupKey}
              </p>
              <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(var(--wow-primary-rgb),0.12)" }}>
                <table className="w-full text-sm">
                  <tbody>
                    {rows.map((a, i) => (
                      <tr key={a.id} style={{ borderTop: i > 0 ? "1px solid rgba(var(--wow-primary-rgb),0.08)" : undefined }}>
                        <td className="px-4 py-2.5 font-medium" style={{ color: classColor(a.character.class), width: 140 }}>
                          {a.character.name}
                        </td>
                        <td className="px-4 py-2.5" style={{ color: "var(--wow-text)" }}>{a.cooldownName}</td>
                        <td className="px-4 py-2.5 text-xs" style={{ color: "var(--wow-text-faint)" }}>
                          {a.targetNote ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {isOfficer && (
                            <button onClick={() => deleteMutation.mutate(a.id)}
                              className="text-xs opacity-40 hover:opacity-100 transition-opacity"
                              style={{ color: "#e06060" }}>✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
