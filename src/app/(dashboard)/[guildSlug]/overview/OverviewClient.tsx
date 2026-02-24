"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CLASS_COLORS: Record<string, string> = {
  "death knight": "#C41E3A", "demon hunter": "#A330C9", druid: "#FF7C0A",
  evoker: "#33937F", hunter: "#AAD372", mage: "#3FC7EB", monk: "#00FF98",
  paladin: "#F48CBA", priest: "#FFFFFF", rogue: "#FFF468", shaman: "#0070DD",
  warlock: "#8788EE", warrior: "#C69B3A",
};
function classColor(cls: string | null) { return CLASS_COLORS[cls?.toLowerCase() ?? ""] ?? "#9d9d9d"; }

const STATUS_LABEL: Record<string, string> = { ACCEPTED: "✓ In", DECLINED: "✗ Out", TENTATIVE: "? Maybe" };
const STATUS_COLOR: Record<string, string> = { ACCEPTED: "#6dbf6d", DECLINED: "#c84040", TENTATIVE: "#c8a96a" };
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

export default function OverviewClient({ guild, memberRole, rosterCount, myCharacters, mySignup, upcomingRaids }: Props) {
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
        <h1 className="text-3xl wow-heading" style={{ color: "#f0c040" }}>{guild.name}</h1>
        <p className="mt-1" style={{ color: "#8a8070" }}>{guild.realm} · {guild.region.toUpperCase()}</p>
      </div>

      {linkStatus && (
        <div className="mb-4 px-4 py-2 rounded text-sm" style={{ background: "rgba(200,169,106,0.08)", border: "1px solid rgba(200,169,106,0.25)", color: "#c8a96a" }}>
          ✓ {linkStatus}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-lg p-5" style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.15)" }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: "#5a5040" }}>{label}</p>
            <p className="text-xl font-semibold mt-2" style={{ color: "#e8dfc8" }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* ── Next Raid + Quick Signup ── */}
        {nextRaid ? (
          <div className="rounded-lg p-6" style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#c8a96a" }}>Next Raid</p>
                <p className="font-semibold" style={{ color: "#e8dfc8" }}>{nextRaid.title}</p>
                <p className="text-sm mt-0.5" style={{ color: "#8a8070" }}>
                  {new Date(nextRaid.scheduledAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="text-xs mt-1" style={{ color: "#5a5040" }}>{nextRaid.raidZone}</p>
              </div>
              <button onClick={() => setModal({ type: "signups", raid: nextRaid })}
                className="text-xs px-3 py-1 rounded transition-all shrink-0"
                style={{ background: "rgba(200,169,106,0.08)", border: "1px solid rgba(200,169,106,0.2)", color: "#c8a96a" }}>
                {nextRaid.signupCount}/{nextRaid.maxAttendees} signups →
              </button>
            </div>

            <RoleBar signups={nextRaid.signups} />

            <div className="wow-divider my-4" />

            {/* My signup status */}
            {localMySignup ? (
              <div>
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#5a5040" }}>Your Status</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium px-2 py-0.5 rounded" style={{ background: "rgba(200,169,106,0.08)", color: STATUS_COLOR[localMySignup.status] }}>
                    {STATUS_LABEL[localMySignup.status]}
                  </span>
                  {localMySignup.characterName && (
                    <span className="text-xs" style={{ color: "#8a8070" }}>as {localMySignup.characterName}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {(["ACCEPTED", "TENTATIVE", "DECLINED"] as const).map(s => (
                    <button key={s} onClick={() => handleUpdateSignup(s)} disabled={signingUp || localMySignup.status === s}
                      className="text-xs px-3 py-1 rounded transition-all"
                      style={{
                        background: localMySignup.status === s ? "rgba(200,169,106,0.15)" : "rgba(200,169,106,0.05)",
                        border: `1px solid ${localMySignup.status === s ? "rgba(200,169,106,0.4)" : "rgba(200,169,106,0.15)"}`,
                        color: localMySignup.status === s ? STATUS_COLOR[s] : "#5a5040",
                        opacity: signingUp ? 0.5 : 1,
                      }}>
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#5a5040" }}>Sign Up</p>
                {myCharacters.length > 0 ? (
                  <>
                    {myCharacters.length > 1 && (
                      <select value={selectedCharId} onChange={e => setSelectedCharId(e.target.value)}
                        className="w-full rounded px-3 py-2 text-sm mb-3"
                        style={{ background: "#0a0b12", border: "1px solid rgba(200,169,106,0.2)", color: "#e8dfc8", outline: "none" }}>
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
                            background: "rgba(200,169,106,0.06)",
                            border: "1px solid rgba(200,169,106,0.2)",
                            color: s === "ACCEPTED" ? "#6dbf6d" : s === "DECLINED" ? "#c84040" : "#c8a96a",
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
                  <p className="text-sm" style={{ color: "#8a8070" }}>
                    No characters linked. <Link href={`/${guild.slug}/profile`} style={{ color: "#c8a96a" }}>Set up your profile →</Link>
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg p-6 flex items-center justify-center" style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.1)" }}>
            <div className="text-center">
              <p className="text-sm mb-2" style={{ color: "#5a5040" }}>No raids scheduled.</p>
              {["GM", "OFFICER"].includes(memberRole) && (
                <Link href={`/${guild.slug}/raids`} className="text-xs" style={{ color: "#c8a96a" }}>Schedule a raid →</Link>
              )}
            </div>
          </div>
        )}

        {/* ── Upcoming Raids ── */}
        <div className="rounded-lg p-6" style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)" }}>
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "#c8a96a" }}>Upcoming Raids</p>
          {upcomingRaids.length === 0 ? (
            <p className="text-sm" style={{ color: "#5a5040" }}>No upcoming raids.</p>
          ) : (
            <div className="space-y-3">
              {upcomingRaids.map((raid, i) => (
                <div key={raid.id} className="flex items-center justify-between py-2"
                  style={{ borderBottom: i < upcomingRaids.length - 1 ? "1px solid rgba(200,169,106,0.08)" : "none" }}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: i === 0 ? "#f0c040" : "#e8dfc8" }}>{raid.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#5a5040" }}>
                      {new Date(raid.scheduledAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      {" · "}{raid.raidZone}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs" style={{ color: "#8a8070" }}>{raid.signupCount}/{raid.maxAttendees}</p>
                    <button onClick={() => setModal({ type: "signups", raid })}
                      className="text-xs mt-0.5 transition-colors"
                      style={{ color: "#5a5040" }}
                      onMouseOver={e => e.currentTarget.style.color = "#c8a96a"}
                      onMouseOut={e => e.currentTarget.style.color = "#5a5040"}>
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
              style={{ borderTop: "1px solid rgba(200,169,106,0.08)", color: "#5a5040" }}
              onMouseOver={e => e.currentTarget.style.color = "#c8a96a"}
              onMouseOut={e => e.currentTarget.style.color = "#5a5040"}>
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
            style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.3)", maxHeight: "80vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid rgba(200,169,106,0.15)" }}>
              <div>
                <h2 className="font-semibold" style={{ color: "#f0c040" }}>{modal.raid.title}</h2>
                <p className="text-xs mt-0.5" style={{ color: "#8a8070" }}>
                  {new Date(modal.raid.scheduledAt).toLocaleString("en-GB")} · {modal.raid.signupCount}/{modal.raid.maxAttendees}
                </p>
              </div>
              <button onClick={() => setModal(null)} className="text-xl leading-none" style={{ color: "#5a5040" }}>✕</button>
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
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#5a5040" }}>{label} ({list.length})</p>
                  <div className="space-y-1">
                    {list.map(s => (
                      <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded"
                        style={{ background: "rgba(200,169,106,0.04)", border: "1px solid rgba(200,169,106,0.08)" }}>
                        <div className="flex items-center gap-2">
                          <span>{ROLE_ICON[s.character?.role ?? "DPS"]}</span>
                          <span className="text-sm font-medium" style={{ color: classColor(s.character?.class ?? null) }}>
                            {s.character?.name ?? "Unknown"}
                          </span>
                          <span className="text-xs" style={{ color: "#5a5040" }}>
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
                <p className="text-center text-sm py-4" style={{ color: "#5a5040" }}>No signups yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
