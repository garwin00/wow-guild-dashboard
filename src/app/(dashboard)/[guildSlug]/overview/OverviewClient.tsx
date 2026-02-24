"use client";

import { useState } from "react";

const CLASS_COLORS: Record<string, string> = {
  "death knight": "#C41E3A", "demon hunter": "#A330C9", druid: "#FF7C0A",
  evoker: "#33937F", hunter: "#AAD372", mage: "#3FC7EB", monk: "#00FF98",
  paladin: "#F48CBA", priest: "#FFFFFF", rogue: "#FFF468", shaman: "#0070DD",
  warlock: "#8788EE", warrior: "#C69B3A",
};
function classColor(cls: string) { return CLASS_COLORS[cls?.toLowerCase()] ?? "#9d9d9d"; }

const STATUS_LABEL: Record<string, string> = { ACCEPTED: "✓ In", DECLINED: "✗ Out", TENTATIVE: "? Maybe" };
const STATUS_COLOR: Record<string, string> = { ACCEPTED: "#6dbf6d", DECLINED: "#c84040", TENTATIVE: "#c8a96a" };
const ROLE_ICON: Record<string, string> = { TANK: "🛡️", HEALER: "💚", DPS: "⚔️" };

interface Signup {
  id: string;
  status: string;
  character: { name: string; class: string | null; spec: string | null; role: string } | null;
}

interface NextRaid {
  title: string;
  scheduledAt: string;
  raidZone: string;
  maxAttendees: number;
  signupCount: number;
  signups: Signup[];
}

interface Props {
  guild: { name: string; realm: string; region: string };
  memberRole: string;
  rosterCount: number;
  signupCount: number;
  nextRaid: NextRaid | null;
}

export default function OverviewClient({ guild, memberRole, rosterCount, signupCount, nextRaid }: Props) {
  const [modal, setModal] = useState<"signups" | null>(null);

  const stats = [
    { label: "Roster Size", value: rosterCount, onClick: undefined },
    { label: "Total Signups", value: signupCount, onClick: nextRaid ? () => setModal("signups") : undefined },
    { label: "Next Raid", value: nextRaid ? new Date(nextRaid.scheduledAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "None scheduled" },
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, onClick }) => (
          <div key={label}
            onClick={onClick}
            className={`rounded-lg p-5 transition-all ${onClick ? "cursor-pointer" : ""}`}
            style={{
              background: "#0f1019",
              border: `1px solid ${onClick ? "rgba(200,169,106,0.3)" : "rgba(200,169,106,0.15)"}`,
            }}
            onMouseOver={e => { if (onClick) e.currentTarget.style.background = "rgba(200,169,106,0.06)"; }}
            onMouseOut={e => { if (onClick) e.currentTarget.style.background = "#0f1019"; }}
          >
            <p className="text-xs uppercase tracking-widest" style={{ color: "#5a5040" }}>{label}</p>
            <p className="text-xl font-semibold mt-2" style={{ color: "#e8dfc8" }}>{value}</p>
            {onClick && <p className="text-xs mt-1" style={{ color: "#c8a96a" }}>View signups →</p>}
          </div>
        ))}
      </div>

      {nextRaid && (
        <div className="rounded-lg p-6" style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)" }}>
          <div className="wow-divider mb-4" />
          <h2 className="text-sm uppercase tracking-widest mb-3" style={{ color: "#c8a96a" }}>Next Raid</h2>
          <p className="font-medium" style={{ color: "#e8dfc8" }}>{nextRaid.title}</p>
          <p className="text-sm mt-1" style={{ color: "#8a8070" }}>
            {new Date(nextRaid.scheduledAt).toLocaleString("en-GB")} · {nextRaid.raidZone}
          </p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-sm" style={{ color: "#5a5040" }}>
              {nextRaid.signupCount} / {nextRaid.maxAttendees} signed up
            </span>
            <button onClick={() => setModal("signups")}
              className="text-xs px-3 py-1 rounded transition-all"
              style={{ background: "rgba(200,169,106,0.1)", border: "1px solid rgba(200,169,106,0.25)", color: "#c8a96a" }}>
              View signups
            </button>
          </div>
          <div className="wow-divider mt-4" />
        </div>
      )}

      {!nextRaid && (
        <div className="rounded-lg p-6 text-center" style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.1)", color: "#5a5040" }}>
          No raids scheduled. Officers can create one under <strong style={{ color: "#8a8070" }}>Raids</strong>.
        </div>
      )}

      {/* Signup Modal */}
      {modal === "signups" && nextRaid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setModal(null)}>
          <div className="w-full max-w-lg rounded-lg overflow-hidden"
            style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.3)", maxHeight: "80vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid rgba(200,169,106,0.15)" }}>
              <div>
                <h2 className="font-semibold" style={{ color: "#f0c040" }}>{nextRaid.title}</h2>
                <p className="text-xs mt-0.5" style={{ color: "#8a8070" }}>
                  {new Date(nextRaid.scheduledAt).toLocaleString("en-GB")} · {nextRaid.signupCount}/{nextRaid.maxAttendees}
                </p>
              </div>
              <button onClick={() => setModal(null)} className="text-xl leading-none" style={{ color: "#5a5040" }}>✕</button>
            </div>

            {/* Signup sections */}
            <div className="p-5 space-y-5">
              {[
                { label: "Accepted", list: accepted },
                { label: "Tentative", list: tentative },
                { label: "Declined", list: declined },
              ].map(({ label, list }) => list.length > 0 && (
                <div key={label}>
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#5a5040" }}>
                    {label} ({list.length})
                  </p>
                  <div className="space-y-1">
                    {list.map(s => (
                      <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded"
                        style={{ background: "rgba(200,169,106,0.04)", border: "1px solid rgba(200,169,106,0.08)" }}>
                        <div className="flex items-center gap-2">
                          <span>{ROLE_ICON[s.character?.role ?? "DPS"]}</span>
                          <span className="text-sm font-medium" style={{ color: classColor(s.character?.class ?? "") }}>
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
              {nextRaid.signups.length === 0 && (
                <p className="text-center text-sm py-4" style={{ color: "#5a5040" }}>No signups yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
