"use client";

import { useState } from "react";

type SignupStatus = "ACCEPTED" | "TENTATIVE" | "DECLINED";
interface Character { id: string; name: string; class: string; spec: string | null; role: string; itemLevel: number | null; }
interface Signup { id: string; status: SignupStatus; note: string | null; character: Character; }
interface RaidEvent { id: string; title: string; raidZone: string; scheduledAt: string | Date; maxAttendees: number; minItemLevel: number | null; status: string; description: string | null; _count: { signups: number }; }

const CLASS_COLOR_HEX: Record<string, string> = {
  "death knight": "#C41E3A", "demon hunter": "#A330C9", "druid": "#FF7C0A",
  "evoker": "#33937F", "hunter": "#AAD372", "mage": "#3FC7EB", "monk": "#00FF98",
  "paladin": "#F48CBA", "priest": "#FFFFFF", "rogue": "#FFF468",
  "shaman": "#0070DD", "warlock": "#8788EE", "warrior": "#C69B3A",
};
function classColor(cls: string) { return CLASS_COLOR_HEX[cls.toLowerCase()] ?? "#9ca3af"; }

function ReadinessBadge({ ilvl, min }: { ilvl: number | null; min: number }) {
  if (!ilvl) return <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>—</span>;
  const diff = ilvl - min;
  if (diff >= 0) return <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--wow-success)" }}>✓ {ilvl}</span>;
  if (diff >= -5) return <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--wow-warning)" }}>⚠ {ilvl}</span>;
  return <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--wow-error)" }}>✗ {ilvl}</span>;
}

const STATUS_ICON: Record<SignupStatus, string> = { ACCEPTED: "✓", TENTATIVE: "?", DECLINED: "✗" };

const BLOODLUST_SPECS = new Set(["enhancement", "elemental", "restoration", "beast mastery", "marksmanship", "survival", "arcane", "fire", "frost mage", "unholy", "frost dk"]);
const BLOODLUST_CLASSES = new Set(["shaman", "hunter", "mage"]);
const BREZ_SPECS = new Set(["balance", "feral", "guardian", "restoration druid", "unholy", "blood", "frost dk"]);
const BREZ_CLASSES = new Set(["druid", "death knight", "warlock"]);
const RAID_BUFF_MAP: Record<string, string[]> = {
  "Power Word: Fortitude": ["priest"],
  "Battle Shout": ["warrior"],
  "Arcane Intellect": ["mage"],
  "Mark of the Wild": ["druid"],
  "Blessing of Kings": ["paladin"],
  "Mystic Touch": ["monk"],
  "Chaos Brand": ["demon hunter"],
  "Skyfury": ["shaman"],
};

function CompositionPanel({ signups }: { signups: Signup[] }) {
  const accepted = signups.filter(s => s.status === "ACCEPTED");
  if (accepted.length === 0) return null;
  const tanks = accepted.filter(s => s.character.role === "TANK").length;
  const healers = accepted.filter(s => s.character.role === "HEALER").length;
  const dps = accepted.filter(s => s.character.role === "DPS").length;
  const classes = accepted.map(s => s.character.class.toLowerCase());
  const specs = accepted.map(s => (s.character.spec ?? "").toLowerCase());
  const hasBloodlust = classes.some(c => BLOODLUST_CLASSES.has(c));
  const hasBrez = classes.some(c => BREZ_CLASSES.has(c));
  const missingBuffs = Object.entries(RAID_BUFF_MAP)
    .filter(([, providerClasses]) => !providerClasses.some(c => classes.includes(c)))
    .map(([buff]) => buff);
  void specs;

  const RoleBar = ({ count, total, label, color }: { count: number; total: number; label: string; color: string }) => (
    <div className="flex items-center gap-3">
      <span className="text-xs w-14 text-right" style={{ color: "var(--wow-text-faint)" }}>{label}</span>
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: "6px", background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${total ? (count / total) * 100 : 0}%`, background: color }} />
      </div>
      <span className="text-xs font-mono tabular-nums" style={{ color, width: "2rem" }}>{count}</span>
    </div>
  );

  return (
    <div className="wow-panel p-4 mb-6">
      <h2 className="wow-section-label mb-3" style={{ color: "var(--wow-gold)" }}>Composition ({accepted.length})</h2>
      <div className="space-y-2 mb-3">
        <RoleBar count={tanks} total={accepted.length} label="Tanks" color="#3FC7EB" />
        <RoleBar count={healers} total={accepted.length} label="Healers" color="var(--wow-success)" />
        <RoleBar count={dps} total={accepted.length} label="DPS" color="#FF8C00" />
      </div>
      <div className="flex flex-wrap gap-2 pt-2" style={{ borderTop: "1px solid rgba(200,169,106,0.1)" }}>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium`}
          style={hasBloodlust ? { background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff6060" }
            : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--wow-text-faint)" }}>
          {hasBloodlust ? "✓" : "✗"} Bloodlust
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={hasBrez ? { background: "rgba(100,180,100,0.12)", border: "1px solid rgba(100,180,100,0.3)", color: "#60c060" }
            : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--wow-text-faint)" }}>
          {hasBrez ? "✓" : "✗"} Battle Rez
        </span>
        {missingBuffs.length > 0 && missingBuffs.map(b => (
          <span key={b} className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "rgba(200,64,64,0.08)", border: "1px solid rgba(200,64,64,0.25)", color: "#c07070" }}>
            ✗ {b}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RaidDetailClient({ event, signups: initial, guildSlug, isOfficer, userCharacters, userId }: {
  event: RaidEvent; signups: Signup[]; guildSlug: string; isOfficer: boolean; userCharacters: Character[]; userId: string;
}) {
  const [signups, setSignups] = useState(initial);
  const [selectedChar, setSelectedChar] = useState(userCharacters[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<SignupStatus | "ALL">("ALL");
  const [mainTab, setMainTab] = useState<"signups" | "composition">("signups");

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
    </div>
  );
}
