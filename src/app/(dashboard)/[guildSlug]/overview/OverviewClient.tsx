"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RioRaidTier } from "@/lib/raiderio";

const CLASS_COLORS: Record<string, string> = {
  "death knight": "#C41E3A", "demon hunter": "#A330C9", druid: "#FF7C0A",
  evoker: "#33937F", hunter: "#AAD372", mage: "#3FC7EB", monk: "#00FF98",
  paladin: "#F48CBA", priest: "#FFFFFF", rogue: "#FFF468", shaman: "#0070DD",
  warlock: "#8788EE", warrior: "#C69B3A",
};
function classColor(cls: string | null) { return CLASS_COLORS[cls?.toLowerCase() ?? ""] ?? "#9d9d9d"; }

const STATUS_LABEL: Record<string, string> = { ACCEPTED: "✓ In", DECLINED: "✗ Out", TENTATIVE: "? Maybe" };
const STATUS_COLOR: Record<string, string> = { ACCEPTED: "#6dbf6d", DECLINED: "#c84040", TENTATIVE: "var(--wow-gold)" };
const ROLE_ICON: Record<string, string> = { TANK: "🛡️", HEALER: "💚", DPS: "⚔️" };

interface Character { id: string; name: string; class: string | null; spec: string | null; role: string; isMain: boolean; }
interface Signup {
  id: string;
  status: string;
  characterId: string;
  character: { name: string; class: string | null; spec: string | null; role: string } | null;
}
interface RaidEvent {
  id: string;
  title: string;
  scheduledAt: string;
  raidZone: string;
  maxAttendees: number;
  signupCount: number;
  signups: Signup[];
}
interface MySignup { id: string; status: string; characterName: string | null; raidEventId: string; }

interface Props {
  guild: { name: string; realm: string; region: string; slug: string };
  memberRole: string;
  rosterCount: number;
  myCharacters: Character[];
  mySignup: MySignup | null;
  upcomingRaids: RaidEvent[];
  progression: RioRaidTier[] | null;
}

function RoleBar({ signups }: { signups: Signup[] }) {
  const accepted = signups.filter(s => s.status === "ACCEPTED");
  const tanks = accepted.filter(s => s.character?.role === "TANK").length;
  const healers = accepted.filter(s => s.character?.role === "HEALER").length;
  const dps = accepted.filter(s => s.character?.role === "DPS").length;
  const total = accepted.length || 1;
  if (accepted.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="flex gap-1 h-1.5 rounded-full overflow-hidden">
        <div style={{ width: `${(tanks / total) * 100}%`, background: "#6dbf6d" }} />
        <div style={{ width: `${(healers / total) * 100}%`, background: "#54a2ff" }} />
        <div style={{ width: `${(dps / total) * 100}%`, background: "#c84040" }} />
      </div>
      <div className="flex gap-3 mt-1">
        <span className="text-xs" style={{ color: "#6dbf6d" }}>🛡️ {tanks}</span>
        <span className="text-xs" style={{ color: "#54a2ff" }}>💚 {healers}</span>
        <span className="text-xs" style={{ color: "#c84040" }}>⚔️ {dps}</span>
      </div>
    </div>
  );
}

export default function OverviewClient({ guild, memberRole, rosterCount, myCharacters, mySignup, upcomingRaids, progression }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<{ type: "signups"; raid: RaidEvent } | null>(null);
  const [linkStatus, setLinkStatus] = useState<string | null>(null);
  const [signingUp, setSigningUp] = useState(false);
  const [signupStatus, setSignupStatus] = useState<string | null>(null);
  const [selectedCharId, setSelectedCharId] = useState<string>(myCharacters[0]?.id ?? "");
  const [localMySignup, setLocalMySignup] = useState<MySignup | null>(mySignup);

  const nextRaid = upcomingRaids[0] ?? null;

  useEffect(() => {
    if (myCharacters[0]) setSelectedCharId(myCharacters[0].id);
  }, [myCharacters]);

  // Auto-link characters on first load (once per session per guild)
  useEffect(() => {
    const key = `chars-linked-${guild.slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch("/api/roster/link-characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guildSlug: guild.slug }),
    }).then(r => r.json()).then(data => {
      if (data.linked > 0 || data.role) {
        setLinkStatus(`Linked ${data.linked} character(s) · Role: ${data.role}`);
        router.refresh();
      }
    }).catch(() => {});
  }, [guild.slug, router]);

  async function handleSignup(status: "ACCEPTED" | "DECLINED" | "TENTATIVE") {
    if (!nextRaid || !selectedCharId) return;
    setSigningUp(true);
    setSignupStatus(null);
    const res = await fetch("/api/raids/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raidEventId: nextRaid.id, characterId: selectedCharId, status }),
    });
    const data = await res.json();
    if (data.signup) {
      const char = myCharacters.find(c => c.id === selectedCharId);
      setLocalMySignup({ id: data.signup.id, status, characterName: char?.name ?? null, raidEventId: nextRaid.id });
      router.refresh();
    } else {
      setSignupStatus(data.error ?? "Failed to sign up");
    }
    setSigningUp(false);
  }

  async function handleUpdateSignup(status: "ACCEPTED" | "DECLINED" | "TENTATIVE") {
    if (!localMySignup) return;
    setSigningUp(true);
    const res = await fetch("/api/raids/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raidEventId: localMySignup.raidEventId, characterId: selectedCharId, status }),
    });
    const data = await res.json();
    if (data.signup) {
      setLocalMySignup(prev => prev ? { ...prev, status } : null);
      router.refresh();
    }
    setSigningUp(false);
  }

  const stats = [
    { label: "Roster Size", value: rosterCount },
    { label: "Next Raid", value: nextRaid ? new Date(nextRaid.scheduledAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "None scheduled" },
    { label: "Signups", value: nextRaid ? `${nextRaid.signupCount} / ${nextRaid.maxAttendees}` : "—" },
    { label: "Your Role", value: memberRole },
  ];

  const accepted = nextRaid?.signups.filter(s => s.status === "ACCEPTED") ?? [];
  const tentative = nextRaid?.signups.filter(s => s.status === "TENTATIVE") ?? [];
  const declined = nextRaid?.signups.filter(s => s.status === "DECLINED") ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl wow-heading" style={{ color: "var(--wow-gold-bright)" }}>{guild.name}</h1>
        <p className="mt-1" style={{ color: "var(--wow-text-muted)" }}>{guild.realm} · {guild.region.toUpperCase()}</p>
      </div>

      {linkStatus && (
        <div className="mb-4 px-4 py-2 rounded text-sm" style={{ background: "rgba(var(--wow-primary-rgb),0.08)", border: "1px solid rgba(var(--wow-primary-rgb),0.25)", color: "var(--wow-gold)" }}>
          ✓ {linkStatus}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-lg p-5" style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--wow-text-faint)" }}>{label}</p>
            <p className="text-xl font-semibold mt-2" style={{ color: "var(--wow-text)" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Raid Progression */}
      {progression && progression.length > 0 && (
        <div className="rounded-lg p-5 mb-8" style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--wow-text-faint)" }}>Raid Progression</p>
          <div className="space-y-3">
            {progression.map(tier => {
              const best = tier.mythicKilled > 0 ? "mythic"
                : tier.heroicKilled > 0 ? "heroic"
                : tier.normalKilled > 0 ? "normal" : null;
              const killed = tier.mythicKilled > 0 ? tier.mythicKilled
                : tier.heroicKilled > 0 ? tier.heroicKilled
                : tier.normalKilled;
              const pct = (killed / tier.totalBosses) * 100;
              const barColor = best === "mythic" ? "#ff8000"
                : best === "heroic" ? "#a335ee"
                : best === "normal" ? "#1eff00"
                : "rgba(var(--wow-primary-rgb),0.3)";
              const labelColor = best === "mythic" ? "#ff8000"
                : best === "heroic" ? "#a335ee"
                : best === "normal" ? "#1eff00"
                : "var(--wow-text-faint)";
              return (
                <div key={tier.slug}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm" style={{ color: "var(--wow-text-muted)" }}>{tier.name}</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: labelColor }}>{tier.summary}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(var(--wow-primary-rgb),0.1)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs mt-3 text-right" style={{ color: "var(--wow-text-faint)" }}>
            via <a href="https://raider.io" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">Raider.IO</a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* ── Next Raid + Quick Signup ── */}
        {nextRaid ? (
          <div className="rounded-lg p-6" style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--wow-gold)" }}>Next Raid</p>
                <p className="font-semibold" style={{ color: "var(--wow-text)" }}>{nextRaid.title}</p>
                <p className="text-sm mt-0.5" style={{ color: "var(--wow-text-muted)" }}>
                  {new Date(nextRaid.scheduledAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--wow-text-faint)" }}>{nextRaid.raidZone}</p>
              </div>
              <button onClick={() => setModal({ type: "signups", raid: nextRaid })}
                className="text-xs px-3 py-1 rounded transition-all shrink-0"
                style={{ background: "rgba(var(--wow-primary-rgb),0.08)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-gold)" }}>
                {nextRaid.signupCount}/{nextRaid.maxAttendees} signups →
              </button>
            </div>

            <RoleBar signups={nextRaid.signups} />

            <div className="wow-divider my-4" />

            {/* My signup status */}
            {localMySignup ? (
              <div>
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--wow-text-faint)" }}>Your Status</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium px-2 py-0.5 rounded" style={{ background: "rgba(var(--wow-primary-rgb),0.08)", color: STATUS_COLOR[localMySignup.status] }}>
                    {STATUS_LABEL[localMySignup.status]}
                  </span>
                  {localMySignup.characterName && (
                    <span className="text-xs" style={{ color: "var(--wow-text-muted)" }}>as {localMySignup.characterName}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {(["ACCEPTED", "TENTATIVE", "DECLINED"] as const).map(s => (
                    <button key={s} onClick={() => handleUpdateSignup(s)} disabled={signingUp || localMySignup.status === s}
                      className="text-xs px-3 py-1 rounded transition-all"
                      style={{
                        background: localMySignup.status === s ? "rgba(var(--wow-primary-rgb),0.15)" : "rgba(var(--wow-primary-rgb),0.05)",
                        border: `1px solid ${localMySignup.status === s ? "rgba(var(--wow-primary-rgb),0.4)" : "rgba(var(--wow-primary-rgb),0.15)"}`,
                        color: localMySignup.status === s ? STATUS_COLOR[s] : "var(--wow-text-faint)",
                        opacity: signingUp ? 0.5 : 1,
                      }}>
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--wow-text-faint)" }}>Sign Up</p>
                {myCharacters.length > 0 ? (
                  <>
                    {myCharacters.length > 1 && (
                      <select value={selectedCharId} onChange={e => setSelectedCharId(e.target.value)}
                        className="w-full rounded px-3 py-2 text-sm mb-3"
                        style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)", outline: "none" }}>
                        {myCharacters.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.spec} {c.class}){c.isMain ? " ★" : ""}</option>
                        ))}
                      </select>
                    )}
                    <div className="flex gap-2">
                      {(["ACCEPTED", "TENTATIVE", "DECLINED"] as const).map(s => (
                        <button key={s} onClick={() => handleSignup(s)} disabled={signingUp}
                          className="text-xs px-3 py-1.5 rounded transition-all"
                          style={{
                            background: "rgba(var(--wow-primary-rgb),0.06)",
                            border: "1px solid rgba(var(--wow-primary-rgb),0.2)",
                            color: s === "ACCEPTED" ? "#6dbf6d" : s === "DECLINED" ? "#c84040" : "var(--wow-gold)",
                            opacity: signingUp ? 0.5 : 1,
                            cursor: signingUp ? "wait" : "pointer",
                          }}>
                          {STATUS_LABEL[s]}
                        </button>
                      ))}
                    </div>
                    {signupStatus && <p className="text-xs mt-2" style={{ color: "#c84040" }}>{signupStatus}</p>}
                  </>
                ) : (
                  <p className="text-sm" style={{ color: "var(--wow-text-muted)" }}>
                    No characters linked. <Link href={`/${guild.slug}/profile`} style={{ color: "var(--wow-gold)" }}>Set up your profile →</Link>
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg p-6 flex items-center justify-center" style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.1)" }}>
            <div className="text-center">
              <p className="text-sm mb-2" style={{ color: "var(--wow-text-faint)" }}>No raids scheduled.</p>
              {["GM", "OFFICER"].includes(memberRole) && (
                <Link href={`/${guild.slug}/raids`} className="text-xs" style={{ color: "var(--wow-gold)" }}>Schedule a raid →</Link>
              )}
            </div>
          </div>
        )}

        {/* ── Upcoming Raids ── */}
        <div className="rounded-lg p-6" style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)" }}>
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--wow-gold)" }}>Upcoming Raids</p>
          {upcomingRaids.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--wow-text-faint)" }}>No upcoming raids.</p>
          ) : (
            <div className="space-y-3">
              {upcomingRaids.map((raid, i) => (
                <div key={raid.id} className="flex items-center justify-between py-2"
                  style={{ borderBottom: i < upcomingRaids.length - 1 ? "1px solid rgba(var(--wow-primary-rgb),0.08)" : "none" }}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: i === 0 ? "var(--wow-gold-bright)" : "var(--wow-text)" }}>{raid.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--wow-text-faint)" }}>
                      {new Date(raid.scheduledAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      {" · "}{raid.raidZone}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs" style={{ color: "var(--wow-text-muted)" }}>{raid.signupCount}/{raid.maxAttendees}</p>
                    <button onClick={() => setModal({ type: "signups", raid })}
                      className="text-xs mt-0.5 transition-colors"
                      style={{ color: "var(--wow-text-faint)" }}
                      onMouseOver={e => e.currentTarget.style.color = "var(--wow-gold)"}
                      onMouseOut={e => e.currentTarget.style.color = "var(--wow-text-faint)"}>
                      signups →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {upcomingRaids.length > 0 && (
            <Link href={`/${guild.slug}/raids`}
              className="block text-center text-xs mt-4 pt-3 transition-colors"
              style={{ borderTop: "1px solid rgba(var(--wow-primary-rgb),0.08)", color: "var(--wow-text-faint)" }}
              onMouseOver={e => e.currentTarget.style.color = "var(--wow-gold)"}
              onMouseOut={e => e.currentTarget.style.color = "var(--wow-text-faint)"}>
              View all raids →
            </Link>
          )}
        </div>
      </div>

      {/* ── Signup Modal ── */}
      {modal?.type === "signups" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setModal(null)}>
          <div className="w-full max-w-lg rounded-lg overflow-hidden"
            style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.3)", maxHeight: "80vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
              <div>
                <h2 className="font-semibold" style={{ color: "var(--wow-gold-bright)" }}>{modal.raid.title}</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--wow-text-muted)" }}>
                  {new Date(modal.raid.scheduledAt).toLocaleString("en-GB")} · {modal.raid.signupCount}/{modal.raid.maxAttendees}
                </p>
              </div>
              <button onClick={() => setModal(null)} className="text-xl leading-none" style={{ color: "var(--wow-text-faint)" }}>✕</button>
            </div>
            <div className="p-5">
              <RoleBar signups={modal.raid.signups} />
            </div>
            <div className="px-5 pb-5 space-y-5">
              {[
                { label: "Accepted", list: accepted },
                { label: "Tentative", list: tentative },
                { label: "Declined", list: declined },
              ].map(({ label, list }) => list.length > 0 && (
                <div key={label}>
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--wow-text-faint)" }}>{label} ({list.length})</p>
                  <div className="space-y-1">
                    {list.map(s => (
                      <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded"
                        style={{ background: "rgba(var(--wow-primary-rgb),0.04)", border: "1px solid rgba(var(--wow-primary-rgb),0.08)" }}>
                        <div className="flex items-center gap-2">
                          <span>{ROLE_ICON[s.character?.role ?? "DPS"]}</span>
                          <span className="text-sm font-medium" style={{ color: classColor(s.character?.class ?? null) }}>
                            {s.character?.name ?? "Unknown"}
                          </span>
                          <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>
                            {s.character?.spec ? `${s.character.spec} ` : ""}{s.character?.class}
                          </span>
                        </div>
                        <span className="text-xs font-medium" style={{ color: STATUS_COLOR[s.status] }}>
                          {STATUS_LABEL[s.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {modal.raid.signups.length === 0 && (
                <p className="text-center text-sm py-4" style={{ color: "var(--wow-text-faint)" }}>No signups yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
