"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type GuildRole = "GM" | "OFFICER" | "MEMBER" | "TRIALIST";
interface Guild {
  id: string; name: string; realm: string; region: string;
  wclGuildId: string | null; imageUrl: string | null; bannerUrl: string | null; theme: string;
  discordWebhook: string | null;
  discordNotifyRaidCreated: boolean;
  discordNotifySignupChanged: boolean;
  discordNotifyRosterSynced: boolean;
  isPublic: boolean;
  recruitMessage: string | null;
}
interface Member { id: string; role: GuildRole; user: { id: string; battletag: string | null; name: string | null } }
interface Application {
  id: string; characterName: string; realm: string; class: string; role: string;
  message: string | null; discordTag: string | null; status: string;
  reviewNote: string | null; createdAt: string;
  reviewedBy: { name: string | null; battletag: string | null } | null;
}

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

export default function SettingsClient({ guildSlug, isGm }: {
  guildSlug: string; isGm: boolean;
}) {
  const qc = useQueryClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [wclId, setWclId] = useState("");
  const [wclSaving, setWclSaving] = useState(false);
  const [wclMsg, setWclMsg] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [theme, setTheme] = useState("default");
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const [appearanceMsg, setAppearanceMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [discordRaidCreated, setDiscordRaidCreated] = useState(true);
  const [discordSignupChanged, setDiscordSignupChanged] = useState(true);
  const [discordRosterSynced, setDiscordRosterSynced] = useState(true);
  const [discordSaving, setDiscordSaving] = useState(false);
  const [discordMsg, setDiscordMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [discordTesting, setDiscordTesting] = useState(false);
  const firstLoad = useRef(false);

  // Recruiting state
  const [isPublic, setIsPublic] = useState(false);
  const [recruitMessage, setRecruitMessage] = useState("");
  const [recruitSaving, setRecruitSaving] = useState(false);
  const [recruitMsg, setRecruitMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Applications state
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<{ guild: Guild; members: Member[] }>({
    queryKey: ["settings", guildSlug],
    queryFn: () => fetch(`/api/guild/${guildSlug}/settings`).then((r) => r.json()),
  });

  const { data: appsData } = useQuery<{ applications: Application[]; total: number }>({
    queryKey: ["applications", guildSlug],
    queryFn: () => fetch(`/api/guild/${guildSlug}/applications`).then(r => r.json()),
  });

  useEffect(() => {
    if (data && !firstLoad.current) {
      firstLoad.current = true;
      setMembers(data.members ?? []);
      setWclId(data.guild.wclGuildId ?? "");
      setImageUrl(data.guild.imageUrl ?? "");
      setBannerUrl(data.guild.bannerUrl ?? "");
      setTheme(data.guild.theme ?? "default");
      setDiscordWebhook(data.guild.discordWebhook ?? "");
      setDiscordRaidCreated(data.guild.discordNotifyRaidCreated ?? true);
      setDiscordSignupChanged(data.guild.discordNotifySignupChanged ?? true);
      setDiscordRosterSynced(data.guild.discordNotifyRosterSynced ?? true);
      setIsPublic(data.guild.isPublic ?? false);
      setRecruitMessage(data.guild.recruitMessage ?? "");
    }
  }, [data]);

  async function saveAppearance() {
    setAppearanceSaving(true);
    setAppearanceMsg(null);
    const res = await fetch(`/api/guild/${guildSlug}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: imageUrl || null, bannerUrl: bannerUrl || null, theme }),
    });
    if (res.ok) {
      setAppearanceMsg({ text: "✓ Saved", ok: true });
    } else {
      const d = await res.json();
      setAppearanceMsg({ text: d.error ?? "Failed to save", ok: false });
    }
    setAppearanceSaving(false);
  }

  async function saveWcl(e: React.FormEvent) {
    e.preventDefault();
    setWclSaving(true);
    setWclMsg("");
    const res = await fetch(`/api/guild/${guildSlug}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wclGuildId: wclId || null }),
    });
    setWclMsg(res.ok ? "✓ Saved" : "Failed to save");
    setWclSaving(false);
  }

  async function updateRole(memberId: string, role: GuildRole) {
    if (!data?.guild) return;
    const res = await fetch("/api/settings/role", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId: memberId, role, guildId: data.guild.id }),
    });
    if (res.ok) setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
  }

  async function saveDiscord(e: React.FormEvent) {
    e.preventDefault();
    setDiscordSaving(true);
    setDiscordMsg(null);
    const res = await fetch(`/api/guild/${guildSlug}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        discordWebhook: discordWebhook || null,
        discordNotifyRaidCreated: discordRaidCreated,
        discordNotifySignupChanged: discordSignupChanged,
        discordNotifyRosterSynced: discordRosterSynced,
      }),
    });
    if (res.ok) setDiscordMsg({ text: "✓ Saved", ok: true });
    else setDiscordMsg({ text: "Failed to save", ok: false });
    setDiscordSaving(false);
  }

  async function testDiscord() {
    if (!discordWebhook) return;
    setDiscordTesting(true);
    setDiscordMsg(null);
    const res = await fetch(`/api/guild/${guildSlug}/discord/test`, { method: "POST" });
    if (res.ok) setDiscordMsg({ text: "✓ Test message sent!", ok: true });
    else setDiscordMsg({ text: "Failed — check webhook URL", ok: false });
    setDiscordTesting(false);
  }

  async function saveRecruiting(e: React.FormEvent) {
    e.preventDefault();
    setRecruitSaving(true);
    setRecruitMsg(null);
    const res = await fetch(`/api/guild/${guildSlug}/settings`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic, recruitMessage: recruitMessage || null }),
    });
    setRecruitMsg(res.ok ? { text: "✓ Saved", ok: true } : { text: "Failed to save", ok: false });
    setRecruitSaving(false);
  }

  async function updateApp(id: string, status: string) {
    const res = await fetch(`/api/guild/${guildSlug}/applications/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNote: reviewNotes[id] }),
    });
    if (res.ok) qc.invalidateQueries({ queryKey: ["applications", guildSlug] });
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-sm" style={{ color: "var(--wow-text-faint)" }}>Loading…</span>
      </div>
    );
  }

  const guild = data.guild;

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

      {/* ── Discord Integrations ── */}
      <Section title="Discord Integrations">
        <p className="text-sm" style={{ color: "var(--wow-text-muted)" }}>
          Post automatic notifications to a Discord channel via a webhook URL.
          Create one in Discord → Server Settings → Integrations → Webhooks.
        </p>
        <form onSubmit={saveDiscord} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: "var(--wow-text-faint)" }}>
              Webhook URL
            </label>
            <div className="flex gap-3">
              <input value={discordWebhook} onChange={e => setDiscordWebhook(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="flex-1 rounded px-3 py-2 text-sm outline-none font-mono"
                style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)" }} />
              <button type="button" onClick={testDiscord} disabled={!discordWebhook || discordTesting}
                className="wow-btn text-sm opacity-80 hover:opacity-100 disabled:opacity-40">
                {discordTesting ? "Sending…" : "Test"}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--wow-text-faint)" }}>Notify on</p>
            {[
              { label: "Raid scheduled", value: discordRaidCreated, set: setDiscordRaidCreated },
              { label: "Signup changed", value: discordSignupChanged, set: setDiscordSignupChanged },
              { label: "Roster synced", value: discordRosterSynced, set: setDiscordRosterSynced },
            ].map(({ label, value, set }) => (
              <label key={label} className="flex items-center gap-3 cursor-pointer select-none">
                <button type="button" onClick={() => set(v => !v)}
                  className="w-9 h-5 rounded-full transition-colors shrink-0"
                  style={{ background: value ? "var(--wow-gold)" : "rgba(var(--wow-primary-rgb),0.15)" }}>
                  <span className="block w-4 h-4 rounded-full mx-0.5 transition-transform bg-white"
                    style={{ transform: value ? "translateX(16px)" : "translateX(0)" }} />
                </button>
                <span className="text-sm" style={{ color: "var(--wow-text-muted)" }}>{label}</span>
              </label>
            ))}
          </div>
          {discordMsg && (
            <p className="text-sm" style={{ color: discordMsg.ok ? "var(--wow-gold)" : "#e06060" }}>{discordMsg.text}</p>
          )}
          <button type="submit" disabled={discordSaving} className="wow-btn text-sm">
            {discordSaving ? "Saving…" : "Save Integrations"}
          </button>
        </form>
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

      {/* ── Recruiting ── */}
      <Section title="Recruiting">
        <form onSubmit={saveRecruiting} className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button type="button" onClick={() => setIsPublic(v => !v)}
              className="w-9 h-5 rounded-full transition-colors shrink-0"
              style={{ background: isPublic ? "var(--wow-gold)" : "rgba(var(--wow-primary-rgb),0.15)" }}>
              <span className="block w-4 h-4 rounded-full mx-0.5 transition-transform bg-white"
                style={{ transform: isPublic ? "translateX(16px)" : "translateX(0)" }} />
            </button>
            <div>
              <span className="text-sm" style={{ color: "var(--wow-text)" }}>Enable public guild page</span>
              {isPublic && (
                <a href={`/${guildSlug}`} target="_blank" rel="noopener noreferrer"
                  className="ml-2 text-xs" style={{ color: "var(--wow-gold)", textDecoration: "underline" }}>
                  View public page ↗
                </a>
              )}
            </div>
          </label>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: "var(--wow-text-faint)" }}>
              Recruitment Message
            </label>
            <textarea value={recruitMessage} onChange={e => setRecruitMessage(e.target.value)} rows={4}
              placeholder="Tell potential applicants about your guild, progression, raid schedule and expectations…"
              className="w-full rounded px-3 py-2 text-sm outline-none resize-none"
              style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)" }} />
          </div>
          {recruitMsg && <p className="text-sm" style={{ color: recruitMsg.ok ? "var(--wow-gold)" : "#e06060" }}>{recruitMsg.text}</p>}
          <button type="submit" disabled={recruitSaving} className="wow-btn text-sm">
            {recruitSaving ? "Saving…" : "Save Recruiting"}
          </button>
        </form>
      </Section>

      {/* ── Applications ── */}
      <Section title={`Applications${appsData && appsData.applications.filter(a => a.status === "PENDING").length > 0 ? ` (${appsData.applications.filter(a => a.status === "PENDING").length} pending)` : ""}`}>
        {!appsData || appsData.applications.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--wow-text-faint)" }}>No applications yet.</p>
        ) : (
          <div className="space-y-1">
            {appsData.applications.map(app => {
              const statusColor = app.status === "PENDING" ? "#fbbf24" : app.status === "REVIEWING" ? "#60a5fa" : app.status === "ACCEPTED" ? "#40c864" : "#e06060";
              const isExpanded = expandedApp === app.id;
              return (
                <div key={app.id} className="rounded-lg overflow-hidden"
                  style={{ border: "1px solid rgba(var(--wow-primary-rgb),0.12)" }}>
                  <button onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    style={{ background: "rgba(var(--wow-primary-rgb),0.04)" }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-medium text-sm" style={{ color: "var(--wow-text)" }}>{app.characterName}</span>
                      <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>{app.class} · {app.role}</span>
                      {app.discordTag && <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>#{app.discordTag}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>
                        {new Date(app.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                      <span className="text-xs rounded-full px-2 py-0.5 font-semibold"
                        style={{ background: `${statusColor}18`, border: `1px solid ${statusColor}50`, color: statusColor }}>
                        {app.status}
                      </span>
                      <span className="text-xs" style={{ color: "var(--wow-text-faint)" }}>{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 py-3 space-y-3" style={{ borderTop: "1px solid rgba(var(--wow-primary-rgb),0.1)" }}>
                      {app.message && (
                        <div>
                          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--wow-text-faint)" }}>Message</p>
                          <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--wow-text-muted)" }}>{app.message}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "var(--wow-text-faint)" }}>Review Note</label>
                        <textarea
                          value={reviewNotes[app.id] ?? app.reviewNote ?? ""}
                          onChange={e => setReviewNotes(p => ({ ...p, [app.id]: e.target.value }))}
                          rows={2} placeholder="Internal notes…"
                          className="w-full rounded px-3 py-2 text-sm outline-none resize-none"
                          style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)" }} />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => updateApp(app.id, "ACCEPTED")}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ background: "rgba(64,200,100,0.12)", border: "1px solid rgba(64,200,100,0.35)", color: "#40c864" }}>
                          ✓ Accept
                        </button>
                        <button onClick={() => updateApp(app.id, "DECLINED")}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ background: "rgba(200,64,64,0.1)", border: "1px solid rgba(200,64,64,0.3)", color: "#e06060" }}>
                          ✕ Decline
                        </button>
                        <button onClick={() => updateApp(app.id, "REVIEWING")}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.3)", color: "#60a5fa" }}>
                          ⟳ Reviewing
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
