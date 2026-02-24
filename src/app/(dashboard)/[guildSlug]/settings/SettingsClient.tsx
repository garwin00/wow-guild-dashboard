"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GuildRole = "GM" | "OFFICER" | "MEMBER" | "TRIALIST";
interface Guild {
  id: string; name: string; realm: string; region: string;
  wclGuildId: string | null; imageUrl: string | null; bannerUrl: string | null; theme: string;
}
interface Member { id: string; role: GuildRole; user: { id: string; battletag: string | null; name: string | null } }

const ROLES: GuildRole[] = ["GM", "OFFICER", "MEMBER", "TRIALIST"];

const THEMES = [
  {
    id: "default",
    label: "Default",
    desc: "Dark gold & black",
    preview: "linear-gradient(135deg, #0f1019 0%, #0a0b12 50%, #1a1508 100%)",
    accent: "var(--wow-gold)",
    icon: "⚔️",
  },
  {
    id: "horde",
    label: "Horde",
    desc: "Red & black",
    preview: "linear-gradient(135deg, #140808 0%, #0d0505 50%, #1c0808 100%)",
    accent: "#cc3333",
    icon: "🔴",
  },
  {
    id: "alliance",
    label: "Alliance",
    desc: "Blue & gold",
    preview: "linear-gradient(135deg, #081320 0%, #050a14 50%, #0d1e2c 100%)",
    accent: "#4a8fd4",
    icon: "🔵",
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-6 space-y-4" style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
      <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--wow-gold)" }}>{title}</h2>
      {children}
    </div>
  );
}

export default function SettingsClient({ guild, members: initial, isGm, guildSlug }: {
  guild: Guild; members: Member[]; isGm: boolean; guildSlug: string;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initial);

  // WCL
  const [wclId, setWclId] = useState(guild.wclGuildId ?? "");
  const [wclSaving, setWclSaving] = useState(false);
  const [wclMsg, setWclMsg] = useState("");

  // Appearance
  const [imageUrl, setImageUrl] = useState(guild.imageUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(guild.bannerUrl ?? "");
  const [theme, setTheme] = useState(guild.theme ?? "default");
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const [appearanceMsg, setAppearanceMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function saveAppearance() {
    setAppearanceSaving(true);
    setAppearanceMsg(null);
    const res = await fetch(`/api/guilds/${guildSlug}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: imageUrl || null, bannerUrl: bannerUrl || null, theme }),
    });
    if (res.ok) {
      setAppearanceMsg({ text: "✓ Saved", ok: true });
      router.refresh();
    } else {
      const data = await res.json();
      setAppearanceMsg({ text: data.error ?? "Failed to save", ok: false });
    }
    setAppearanceSaving(false);
  }

  async function saveWcl(e: React.FormEvent) {
    e.preventDefault();
    setWclSaving(true);
    setWclMsg("");
    const res = await fetch(`/api/guilds/${guildSlug}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wclGuildId: wclId || null }),
    });
    setWclMsg(res.ok ? "✓ Saved" : "Failed to save");
    setWclSaving(false);
  }

  async function updateRole(memberId: string, role: GuildRole) {
    const res = await fetch("/api/settings/role", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId: memberId, role, guildId: guild.id }),
    });
    if (res.ok) setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-3xl wow-heading" style={{ color: "var(--wow-gold-bright)" }}>Guild Settings</h1>

      {/* ── Guild info ── */}
      <Section title="Guild">
        <div className="space-y-1 text-sm" style={{ color: "var(--wow-text-muted)" }}>
          <p><span style={{ color: "var(--wow-text-faint)" }}>Name: </span>{guild.name}</p>
          <p><span style={{ color: "var(--wow-text-faint)" }}>Realm: </span>{guild.realm}</p>
          <p><span style={{ color: "var(--wow-text-faint)" }}>Region: </span>{guild.region.toUpperCase()}</p>
        </div>
      </Section>

      {/* ── Appearance ── */}
      <Section title="Appearance">
        {/* Theme picker */}
        <div>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--wow-text-faint)" }}>Theme</p>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map(t => (
              <button key={t.id} onClick={() => setTheme(t.id)}
                className="rounded-lg p-3 text-left transition-all"
                style={{
                  background: t.preview,
                  border: theme === t.id ? `2px solid ${t.accent}` : "2px solid transparent",
                  boxShadow: theme === t.id ? `0 0 16px ${t.accent}30` : "none",
                }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">{t.icon}</span>
                  {theme === t.id && (
                    <span className="text-xs font-bold" style={{ color: t.accent }}>✓</span>
                  )}
                </div>
                <p className="text-xs font-semibold" style={{ color: t.accent }}>{t.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--wow-text-faint)" }}>{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Guild image URL */}
        <div>
          <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: "var(--wow-text-faint)" }}>
            Guild Profile Image URL
          </label>
          <div className="flex gap-3 items-start">
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5"
                style={{ border: "1px solid rgba(var(--wow-primary-rgb),0.3)" }} />
            )}
            <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
              placeholder="https://example.com/guild-icon.png"
              className="flex-1 rounded px-3 py-2 text-sm outline-none"
              style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)" }} />
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--wow-text-faint)" }}>
            Shown in the sidebar next to the guild name. Use an external image URL or a CDN link.
          </p>
        </div>

        {/* Banner URL */}
        <div>
          <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: "var(--wow-text-faint)" }}>
            Guild Banner Image URL
          </label>
          <input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)}
            placeholder="https://example.com/guild-banner.png"
            className="w-full rounded px-3 py-2 text-sm outline-none"
            style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)" }} />
          <p className="text-xs mt-1" style={{ color: "var(--wow-text-faint)" }}>Wide banner shown on the overview page header.</p>
        </div>

        {appearanceMsg && (
          <p className="text-sm" style={{ color: appearanceMsg.ok ? "var(--wow-gold)" : "#e06060" }}>{appearanceMsg.text}</p>
        )}
        <button onClick={saveAppearance} disabled={appearanceSaving} className="wow-btn text-sm">
          {appearanceSaving ? "Saving…" : "Save Appearance"}
        </button>
      </Section>

      {/* ── Warcraft Logs ── */}
      <Section title="Warcraft Logs">
        <div className="space-y-2 text-sm mb-4" style={{ color: "var(--wow-text-muted)" }}>
          <p>To link your guild, find your guild name on Warcraft Logs:</p>
          <ol className="list-decimal list-inside space-y-1.5 ml-1">
            <li>
              Go to{" "}
              <a href={`https://www.warcraftlogs.com/guild/eu/${guild.realm.toLowerCase().replace(/\s+/g, "-")}/${guild.name.toLowerCase().replace(/\s+/g, "-")}`}
                target="_blank" rel="noopener noreferrer" style={{ color: "var(--wow-gold)", textDecoration: "underline" }}>
                your guild&apos;s WCL page ↗
              </a>
            </li>
            <li>Copy the guild name slug from the URL (lowercase, hyphens)</li>
            <li>Paste it below</li>
          </ol>
        </div>
        <form onSubmit={saveWcl} className="flex gap-3">
          <input value={wclId} onChange={e => setWclId(e.target.value)}
            placeholder={`e.g. ${guild.name.toLowerCase().replace(/\s+/g, "-")}`}
            className="flex-1 rounded px-3 py-2 text-sm outline-none"
            style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)", fontFamily: "monospace" }} />
          <button type="submit" disabled={wclSaving} className="wow-btn">{wclSaving ? "Saving…" : "Save"}</button>
        </form>
        {guild.wclGuildId && (
          <p className="text-xs mt-1" style={{ color: "var(--wow-text-faint)" }}>
            Currently linked: <code style={{ color: "var(--wow-gold)" }}>{guild.wclGuildId}</code>
            {" "}<span style={{ color: "#40c864" }}>✓ Connected</span>
          </p>
        )}
        {wclMsg && <p className="text-xs mt-1" style={{ color: "#40c864" }}>{wclMsg}</p>}
      </Section>

      {/* ── Member roles ── */}
      <Section title="Member Roles">
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between py-1">
              <span className="text-sm" style={{ color: "var(--wow-text)" }}>{m.user.battletag ?? m.user.name ?? "Unknown"}</span>
              {isGm && m.role !== "GM" ? (
                <select value={m.role} onChange={e => updateRole(m.id, e.target.value as GuildRole)}
                  className="text-xs rounded px-2 py-1 outline-none"
                  style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)" }}>
                  {ROLES.filter(r => r !== "GM").map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <span className="text-xs rounded-full px-2 py-0.5"
                  style={m.role === "GM"
                    ? { background: "rgba(240,192,64,0.12)", border: "1px solid rgba(240,192,64,0.4)", color: "var(--wow-gold-bright)" }
                    : m.role === "OFFICER"
                    ? { background: "rgba(var(--wow-primary-rgb),0.12)", border: "1px solid rgba(var(--wow-primary-rgb),0.4)", color: "var(--wow-gold)" }
                    : { background: "rgba(var(--wow-primary-rgb),0.06)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)", color: "var(--wow-text-faint)" }}>
                  {m.role}
                </span>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
