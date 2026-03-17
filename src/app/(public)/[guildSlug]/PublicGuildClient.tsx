"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface GuildPublicData {
  name: string; realm: string; region: string; imageUrl: string | null;
  recruitMessage: string | null; rosterSize: number; avgItemLevel: number | null;
  roleCounts: { tank: number; healer: number; dps: number };
  progression: { name: string; normalKilled: number; normalTotal: number; heroicKilled: number; heroicTotal: number; mythicKilled: number; mythicTotal: number; summary: string }[] | null;
}

const WOW_CLASSES = [
  "Death Knight","Demon Hunter","Druid","Evoker","Hunter","Mage",
  "Monk","Paladin","Priest","Rogue","Shaman","Warlock","Warrior",
];

function ProgressBar({ label, killed, total, color }: { label: string; killed: number; total: number; color: string }) {
  if (!total) return null;
  const pct = Math.round((killed / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span style={{ color: "var(--wow-text-faint)" }}>{label}</span>
        <span style={{ color }}>{killed}/{total}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function PublicGuildClient({ guildSlug }: { guildSlug: string }) {
  const [form, setForm] = useState({ characterName: "", realm: "", class: "", role: "", message: "", discordTag: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const { data, isLoading, isError } = useQuery<GuildPublicData>({
    queryKey: ["public-guild", guildSlug],
    queryFn: () => fetch(`/api/guild/${guildSlug}/public`).then(async r => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
    retry: false,
  });

  async function submitApplication(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError("");
    const res = await fetch(`/api/guild/${guildSlug}/apply`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setSubmitted(true); }
    else { setError((await res.json()).error ?? "Failed to submit"); }
    setSubmitting(false);
  }

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0b12" }}>
      <span className="text-sm" style={{ color: "#666" }}>Loading…</span>
    </div>
  );

  if (isError || !data) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-3" style={{ background: "#0a0b12" }}>
      <p className="text-2xl">⚔️</p>
      <p className="text-sm" style={{ color: "#888" }}>This guild page is not public or does not exist.</p>
      <a href="/" className="text-xs" style={{ color: "#f0c040" }}>← Back to ZugZug</a>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#0a0b12", color: "#e0d0a0", fontFamily: "inherit" }}>
      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-8">
        <div className="flex items-center gap-4 mb-2">
          {data.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.imageUrl} alt="" className="w-14 h-14 rounded-full object-cover" style={{ border: "2px solid #f0c04040" }} />
          ) : (
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: "rgba(240,192,64,0.1)", border: "1px solid rgba(240,192,64,0.2)" }}>⚔️</div>
          )}
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "#f0c040", fontFamily: "Georgia, serif", letterSpacing: "0.05em" }}>{data.name}</h1>
            <p className="text-sm" style={{ color: "#888" }}>{data.realm} · {data.region.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex gap-4 mt-4 text-sm" style={{ color: "#888" }}>
          <span><span style={{ color: "#e0d0a0" }}>{data.rosterSize}</span> members</span>
          {data.avgItemLevel && <span>avg <span style={{ color: "#e0d0a0" }}>{data.avgItemLevel}</span> iLvl</span>}
          <span><span style={{ color: "#c69b3a" }}>{data.roleCounts.tank}</span>T / <span style={{ color: "#40b060" }}>{data.roleCounts.healer}</span>H / <span style={{ color: "#c04040" }}>{data.roleCounts.dps}</span>D</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 space-y-8 pb-20">
        {/* Progression */}
        {data.progression && data.progression.length > 0 && (
          <div className="rounded-lg p-6 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(240,192,64,0.15)" }}>
            <h2 className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#f0c040" }}>Progression</h2>
            {data.progression.slice(0, 3).map(tier => (
              <div key={tier.name} className="space-y-2">
                <p className="text-sm font-medium" style={{ color: "#e0d0a0" }}>{tier.name}</p>
                <ProgressBar label="Normal" killed={tier.normalKilled} total={tier.normalTotal} color="#40b060" />
                <ProgressBar label="Heroic" killed={tier.heroicKilled} total={tier.heroicTotal} color="#4a8fd4" />
                <ProgressBar label="Mythic" killed={tier.mythicKilled} total={tier.mythicTotal} color="#f0c040" />
              </div>
            ))}
          </div>
        )}

        {/* Recruit message */}
        {data.recruitMessage && (
          <div className="rounded-lg p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(240,192,64,0.15)" }}>
            <h2 className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "#f0c040" }}>About Us</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#c0b080" }}>{data.recruitMessage}</p>
          </div>
        )}

        {/* Application form */}
        <div className="rounded-lg p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(240,192,64,0.15)" }}>
          <h2 className="text-xs uppercase tracking-widest font-semibold mb-5" style={{ color: "#f0c040" }}>Apply to Join</h2>

          {submitted ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-2xl">✅</p>
              <p className="text-sm font-medium" style={{ color: "#e0d0a0" }}>Application submitted!</p>
              <p className="text-xs" style={{ color: "#888" }}>The officers will review your application and be in touch.</p>
            </div>
          ) : (
            <form onSubmit={submitApplication} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Character Name", key: "characterName" as const, placeholder: "Thrall", required: true },
                  { label: "Realm", key: "realm" as const, placeholder: "Silvermoon", required: true },
                  { label: "Discord Tag", key: "discordTag" as const, placeholder: "thrall#1234" },
                ].map(({ label, key, placeholder, required }) => (
                  <div key={key} className={key === "discordTag" ? "col-span-2 sm:col-span-1" : ""}>
                    <label className="block text-xs mb-1.5" style={{ color: "#888" }}>{label}{required && <span style={{ color: "#e06060" }}> *</span>}</label>
                    <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder} required={required}
                      className="w-full rounded px-3 py-2 text-sm outline-none"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(240,192,64,0.15)", color: "#e0d0a0" }} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "#888" }}>Class <span style={{ color: "#e06060" }}>*</span></label>
                  <select value={form.class} onChange={e => setForm(f => ({ ...f, class: e.target.value }))} required
                    className="w-full rounded px-3 py-2 text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(240,192,64,0.15)", color: "#e0d0a0" }}>
                    <option value="">Select class…</option>
                    {WOW_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "#888" }}>Role <span style={{ color: "#e06060" }}>*</span></label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} required
                    className="w-full rounded px-3 py-2 text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(240,192,64,0.15)", color: "#e0d0a0" }}>
                    <option value="">Select role…</option>
                    <option value="TANK">Tank</option>
                    <option value="HEALER">Healer</option>
                    <option value="DPS">DPS</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#888" }}>Tell us about yourself</label>
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={4} placeholder="Previous experience, availability, why you want to join…"
                  className="w-full rounded px-3 py-2 text-sm outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(240,192,64,0.15)", color: "#e0d0a0" }} />
              </div>
              {error && <p className="text-sm" style={{ color: "#e06060" }}>{error}</p>}
              <button type="submit" disabled={submitting}
                className="w-full py-3 rounded font-semibold text-sm transition-all"
                style={{ background: "rgba(240,192,64,0.15)", border: "1px solid rgba(240,192,64,0.4)", color: "#f0c040" }}>
                {submitting ? "Submitting…" : "Submit Application"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs" style={{ color: "#444" }}>
          Powered by <a href="/" style={{ color: "#f0c04060" }}>ZugZug</a>
        </p>
      </div>
    </div>
  );
}
