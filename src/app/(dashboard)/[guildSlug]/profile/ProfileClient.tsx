"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { scoreColor, avatarToInset } from "@/lib/raiderio";

const ROLES = ["TANK", "HEALER", "DPS"] as const;
const SPECS: Record<string, string[]> = {
  "death knight": ["Blood", "Frost", "Unholy"],
  "demon hunter": ["Havoc", "Vengeance"],
  druid: ["Balance", "Feral", "Guardian", "Restoration"],
  evoker: ["Augmentation", "Devastation", "Preservation"],
  hunter: ["Beast Mastery", "Marksmanship", "Survival"],
  mage: ["Arcane", "Fire", "Frost"],
  monk: ["Brewmaster", "Mistweaver", "Windwalker"],
  paladin: ["Holy", "Protection", "Retribution"],
  priest: ["Discipline", "Holy", "Shadow"],
  rogue: ["Assassination", "Outlaw", "Subtlety"],
  shaman: ["Elemental", "Enhancement", "Restoration"],
  warlock: ["Affliction", "Demonology", "Destruction"],
  warrior: ["Arms", "Fury", "Protection"],
};

const CLASS_COLORS: Record<string, string> = {
  "death knight": "#C41E3A", "demon hunter": "#A330C9", druid: "#FF7C0A",
  evoker: "#33937F", hunter: "#AAD372", mage: "#3FC7EB", monk: "#00FF98",
  paladin: "#F48CBA", priest: "#FFFFFF", rogue: "#FFF468", shaman: "#0070DD",
  warlock: "#8788EE", warrior: "#C69B3A",
};
function classColor(cls: string | null) { return CLASS_COLORS[cls?.toLowerCase() ?? ""] ?? "#9d9d9d"; }

const ROLE_ICON: Record<string, string> = { TANK: "🛡️", HEALER: "💚", DPS: "⚔️" };
const ROLE_BADGE: Record<string, string> = { GM: "👑 GM", OFFICER: "⭐ Officer", MEMBER: "🗡️ Member" };

const ARMORY_LOCALE: Record<string, string> = { eu: "en-gb", us: "en-us", kr: "ko-kr", tw: "zh-tw" };
function externalLinks(region: string, realm: string, name: string) {
  const locale = ARMORY_LOCALE[region.toLowerCase()] ?? "en-gb";
  const r = region.toLowerCase();
  const rlm = realm.toLowerCase();
  const n = encodeURIComponent(name);
  return {
    armory: `https://worldofwarcraft.blizzard.com/${locale}/character/${r}/${rlm}/${n}`,
    raiderio: `https://raider.io/characters/${r}/${rlm}/${name}`,
    wcl: `https://www.warcraftlogs.com/character/${r}/${rlm}/${n}`,
  };
}

interface Character {
  id: string;
  name: string;
  realm: string;
  region: string;
  class: string;
  spec: string | null;
  role: string;
  itemLevel: number | null;
  level: number | null;
  isMain: boolean;
  avatarUrl: string | null;
  guildName: string | null;
  guildSlug: string | null;
  mythicScore: number | null;
}

interface Props {
  user: { id: string; battletag: string; email: string | null; image: string | null; bnetId: string };
  memberRole: string;
  guildSlug: string;
  characters: Character[];
}

function CharCard({ char, isMain, onSetMain, onUnlink, onEdit, pending }: {
  char: Character; isMain: boolean; onSetMain: () => void;
  onUnlink: () => void; onEdit: (updates: { role?: string; spec?: string }) => void;
  pending: boolean;
}) {
  const color = classColor(char.class);
  const [editing, setEditing] = useState(false);
  const [editRole, setEditRole] = useState(char.role);
  const [editSpec, setEditSpec] = useState(char.spec ?? "");
  const specs = SPECS[char.class?.toLowerCase() ?? ""] ?? [];

  function saveEdit() {
    onEdit({ role: editRole, spec: editSpec || undefined });
    setEditing(false);
  }

  return (
    <div className="rounded-lg transition-all relative group" style={{
      background: "var(--wow-surface)",
      border: isMain ? `2px solid ${color}60` : "1px solid rgba(var(--wow-primary-rgb),0.15)",
      boxShadow: isMain ? `0 0 20px ${color}20` : "none",
    }}>
      {/* Action buttons — top right */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={() => setEditing(e => !e)} title="Edit role/spec"
          className="w-6 h-6 rounded flex items-center justify-center text-xs"
          style={{ background: "rgba(0,0,0,0.6)", color: "var(--wow-gold)" }}>✏</button>
        <button onClick={onUnlink} title="Unlink character"
          className="w-6 h-6 rounded flex items-center justify-center text-xs"
          style={{ background: "rgba(0,0,0,0.6)", color: "#e06060" }}>✕</button>
      </div>

      {/* Two-column: avatar | data */}
      <div className="flex items-start gap-3 p-3 pr-12">
        {/* Col 1 — avatar */}
        {char.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={char.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5"
            style={{ boxShadow: `0 0 0 2px ${color}60` }} />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5"
            style={{ background: `${color}20`, color }}>
            {char.name[0].toUpperCase()}
          </div>
        )}

        {/* Col 2 — name, spec/class, stats */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="font-semibold text-sm truncate" style={{ color }}>{char.name}</p>
            {isMain && <span className="text-xs px-1 py-0.5 rounded shrink-0" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>Main</span>}
            {char.level && <span className="text-xs ml-auto shrink-0 tabular-nums" style={{ color: "var(--wow-text-faint)" }}>Lv {char.level}</span>}
          </div>
          <p className="text-xs truncate mb-1.5" style={{ color: "var(--wow-text-muted)" }}>
            {char.spec ? `${char.spec} ` : ""}{char.class}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tabular-nums" style={{ color: char.itemLevel ? "var(--wow-text)" : "var(--wow-text-faint)" }}>
              {char.itemLevel ?? "—"}
              <span className="text-xs font-normal ml-0.5" style={{ color: "var(--wow-text-muted)" }}>iLvl</span>
            </span>
            <span className="text-sm font-bold tabular-nums" style={{ color: (char.mythicScore && char.mythicScore > 0) ? scoreColor(char.mythicScore) : "var(--wow-text-faint)" }}>
              {(char.mythicScore && char.mythicScore > 0) ? char.mythicScore.toFixed(0) : "—"}
              <span className="text-xs font-normal ml-0.5" style={{ color: "var(--wow-text-muted)" }}>M+</span>
            </span>
          </div>
        </div>
      </div>

      {/* Edit inline form */}
      {editing && (
        <div className="mx-3 mb-3 space-y-2 p-2 rounded" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)" }}>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-xs mb-1" style={{ color: "var(--wow-text-faint)" }}>Role</p>
              <select value={editRole} onChange={e => setEditRole(e.target.value)}
                className="w-full text-xs rounded px-2 py-1"
                style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.3)", color: "var(--wow-text)" }}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {specs.length > 0 && (
              <div className="flex-1">
                <p className="text-xs mb-1" style={{ color: "var(--wow-text-faint)" }}>Spec</p>
                <select value={editSpec} onChange={e => setEditSpec(e.target.value)}
                  className="w-full text-xs rounded px-2 py-1"
                  style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.3)", color: "var(--wow-text)" }}>
                  <option value="">—</option>
                  {specs.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={saveEdit} className="flex-1 text-xs py-1 rounded font-medium"
              style={{ background: "rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-gold)", border: "1px solid rgba(var(--wow-primary-rgb),0.3)" }}>
              Save
            </button>
            <button onClick={() => setEditing(false)} className="flex-1 text-xs py-1 rounded"
              style={{ background: "rgba(var(--wow-primary-rgb),0.05)", color: "var(--wow-text-faint)", border: "1px solid rgba(var(--wow-primary-rgb),0.1)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Set as main — subtle link-style */}
      {!isMain && !editing && (
        <button onClick={onSetMain} disabled={pending}
          className="w-full py-2 text-xs transition-colors"
          style={{
            borderTop: "1px solid rgba(var(--wow-primary-rgb),0.1)",
            color: pending ? "var(--wow-text-faint)" : "var(--wow-text-faint)",
            background: "transparent",
          }}
          onMouseOver={e => !pending && (e.currentTarget.style.color = "var(--wow-gold)")}
          onMouseOut={e => (e.currentTarget.style.color = "var(--wow-text-faint)")}>
          {pending ? "Setting…" : "Set as main"}
        </button>
      )}
    </div>
  );
}

export default function ProfileClient({ user, memberRole, guildSlug, characters: initialChars }: Props) {
  const router = useRouter();
  const [chars, setChars] = useState(initialChars);
  const [isPending, startTransition] = useTransition();
  const [settingMain, setSettingMain] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkMsg, setLinkMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [linksOpen, setLinksOpen] = useState(false);

  // Account settings state
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  const mainChar = chars.find(c => c.isMain) ?? chars[0] ?? null;
  const alts = chars.filter(c => c.id !== mainChar?.id);
  const hasBnet = Boolean(user.bnetId) && !user.bnetId.startsWith("email:");
  const hasPassword = Boolean(user.email);

  async function setMain(charId: string) {
    setSettingMain(charId);
    await fetch("/api/characters/set-main", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: charId }),
    });
    setChars(prev => prev.map(c => ({ ...c, isMain: c.id === charId })));
    setSettingMain(null);
    startTransition(() => router.refresh());
  }

  async function unlinkChar(charId: string) {
    if (!confirm("Remove this character from your profile?")) return;
    await fetch("/api/characters/unlink", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: charId }),
    });
    setChars(prev => prev.filter(c => c.id !== charId));
  }

  async function editChar(charId: string, updates: { role?: string; spec?: string }) {
    await fetch(`/api/characters/${charId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setChars(prev => prev.map(c => c.id === charId ? { ...c, ...updates } : c));
  }

  async function syncChars() {
    setLinking(true);
    setLinkMsg(null);
    const res = await fetch("/api/roster/link-characters", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guildSlug }),
    });
    const data = await res.json();
    if (data.error) {
      setLinkMsg({ text: data.error, ok: false });
    } else {
      setLinkMsg({ text: `✓ Linked ${data.linked} character(s)`, ok: true });
      if (data.linked > 0) startTransition(() => router.refresh());
    }
    setLinking(false);
  }

  async function changePassword() {
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ text: "Passwords don't match", ok: false }); return;
    }
    setPwSaving(true);
    const res = await fetch("/api/account/change-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
    });
    const data = await res.json();
    if (data.ok) {
      setPwMsg({ text: "✓ Password updated", ok: true });
      setPwForm({ current: "", next: "", confirm: "" });
      setShowPwForm(false);
    } else {
      setPwMsg({ text: data.error ?? "Failed", ok: false });
    }
    setPwSaving(false);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl wow-heading" style={{ color: "var(--wow-gold-bright)" }}>Profile</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {hasBnet ? (
              <p className="text-sm font-medium" style={{ color: "var(--wow-text)" }}>{user.battletag}</p>
            ) : (
              <p className="text-sm" style={{ color: "var(--wow-text-muted)" }}>{user.email}</p>
            )}
            <span className="text-xs px-2 py-0.5 rounded"
              style={{ background: "rgba(var(--wow-primary-rgb),0.1)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-gold)" }}>
              {ROLE_BADGE[memberRole] ?? memberRole}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!hasBnet && (
            <button onClick={() => signIn("battlenet")} className="wow-btn text-sm">
              🔗 Link Battle.net
            </button>
          )}
          <button onClick={syncChars} disabled={linking} className="wow-btn-ghost text-sm">
            {linking ? "Syncing…" : "↻ Sync Characters"}
          </button>
        </div>
      </div>

      {linkMsg && (
        <div className="px-4 py-2 rounded text-sm" style={{
          background: linkMsg.ok ? "rgba(var(--wow-primary-rgb),0.08)" : "rgba(200,60,60,0.08)",
          border: `1px solid ${linkMsg.ok ? "rgba(var(--wow-primary-rgb),0.25)" : "rgba(200,60,60,0.25)"}`,
          color: linkMsg.ok ? "var(--wow-gold)" : "#e06060",
        }}>
          {linkMsg.text}
        </div>
      )}

      {/* Characters */}
      {chars.length === 0 ? (
        <div className="rounded-lg p-8 text-center" style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
          <p className="text-sm mb-3" style={{ color: "var(--wow-text-muted)" }}>No characters linked yet.</p>
          {!hasBnet ? (
            <button onClick={() => signIn("battlenet")} className="wow-btn">
              🔗 Link Battle.net to import characters
            </button>
          ) : (
            <button onClick={syncChars} disabled={linking} className="wow-btn">
              {linking ? "Syncing…" : "↻ Sync my characters"}
            </button>
          )}
        </div>
      ) : (
        <>
          {mainChar && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--wow-text-faint)" }}>Main Character</p>
              <div className="rounded-lg overflow-hidden relative group" style={{
                background: "var(--wow-surface)",
                border: `2px solid ${classColor(mainChar.class)}50`,
                boxShadow: `0 0 24px ${classColor(mainChar.class)}18`,
              }}>
                {/* Top-right controls: links dropdown + unlink */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                  {/* External links dropdown */}
                  <div className="relative">
                    <button onClick={() => setLinksOpen(o => !o)}
                      className="w-7 h-7 rounded flex items-center justify-center text-sm transition-opacity"
                      style={{ background: "rgba(0,0,0,0.55)", color: "var(--wow-text-muted)" }}
                      title="View on external sites">
                      ↗
                    </button>
                    {linksOpen && (() => {
                      const links = externalLinks(mainChar.region, mainChar.realm, mainChar.name);
                      return (
                        <div className="absolute right-0 top-8 rounded-lg py-1 min-w-[160px] z-30"
                          style={{ background: "var(--wow-surface-2)", border: "1px solid rgba(var(--wow-primary-rgb),0.25)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                          {[
                            { href: links.armory, label: "Armory" },
                            { href: links.raiderio, label: "Raider.IO" },
                            { href: links.wcl, label: "Warcraft Logs" },
                          ].map(({ href, label }) => (
                            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                              onClick={() => setLinksOpen(false)}
                              className="flex items-center justify-between px-3 py-2 text-xs transition-colors"
                              style={{ color: "var(--wow-text-muted)" }}
                              onMouseOver={e => (e.currentTarget.style.color = "var(--wow-gold-bright)")}
                              onMouseOut={e => (e.currentTarget.style.color = "var(--wow-text-muted)")}>
                              {label}
                              <span style={{ color: "var(--wow-text-faint)" }}>↗</span>
                            </a>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  {/* Unlink */}
                  <button onClick={() => unlinkChar(mainChar.id)} title="Unlink"
                    className="w-7 h-7 rounded flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(0,0,0,0.55)", color: "#e06060" }}>✕</button>
                </div>

                {/* Two-column layout: portrait | data */}
                <div className="flex items-center gap-4 p-4 pr-12">
                  {/* Col 1 — portrait, vertically centered */}
                  {mainChar.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarToInset(mainChar.avatarUrl)}
                      alt=""
                      className="rounded-lg object-cover object-top shrink-0"
                      style={{ width: "80px", height: "80px", boxShadow: `0 0 0 2px ${classColor(mainChar.class)}60` }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="rounded-lg flex items-center justify-center font-bold text-2xl shrink-0"
                      style={{ width: "80px", height: "80px", background: `${classColor(mainChar.class)}20`, color: classColor(mainChar.class) }}>
                      {mainChar.name[0].toUpperCase()}
                    </div>
                  )}

                  {/* Col 2 — name, spec, stats */}
                  <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold truncate leading-tight" style={{ color: classColor(mainChar.class) }}>{mainChar.name}</p>
                      {mainChar.level && <span className="text-sm ml-auto shrink-0 tabular-nums" style={{ color: "var(--wow-text-faint)" }}>Lv {mainChar.level}</span>}
                    </div>
                    <p className="text-sm" style={{ color: "var(--wow-text-muted)" }}>
                      {mainChar.spec ? `${mainChar.spec} ` : ""}{mainChar.class}
                    </p>
                    <div className="flex items-end gap-5 mt-3">
                      <div>
                        <p className="text-xl font-bold leading-none tabular-nums" style={{ color: mainChar.itemLevel ? "var(--wow-text)" : "var(--wow-text-faint)" }}>
                          {mainChar.itemLevel ?? "—"}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--wow-text-faint)" }}>Item Level</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold leading-none tabular-nums" style={{ color: (mainChar.mythicScore && mainChar.mythicScore > 0) ? scoreColor(mainChar.mythicScore) : "var(--wow-text-faint)" }}>
                          {(mainChar.mythicScore && mainChar.mythicScore > 0) ? mainChar.mythicScore.toFixed(0) : "—"}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--wow-text-faint)" }}>Mythic+ Score</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {alts.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--wow-text-faint)" }}>
                Alts ({alts.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {alts.map(char => (
                  <CharCard
                    key={char.id}
                    char={char}
                    isMain={false}
                    onSetMain={() => setMain(char.id)}
                    onUnlink={() => unlinkChar(char.id)}
                    onEdit={(updates) => editChar(char.id, updates)}
                    pending={settingMain === char.id || isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Account Settings */}
      <div className="rounded-lg p-6 space-y-4" style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
        <h2 className="text-sm uppercase tracking-widest font-semibold" style={{ color: "var(--wow-text-faint)" }}>Account Settings</h2>

        {/* BNet status */}
        <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid rgba(var(--wow-primary-rgb),0.1)" }}>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--wow-text)" }}>Battle.net</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--wow-text-faint)" }}>
              {hasBnet ? user.battletag : "Not linked"}
            </p>
          </div>
          {hasBnet ? (
            <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(0,112,221,0.15)", color: "#4aadff", border: "1px solid rgba(0,112,221,0.3)" }}>
              ✓ Linked
            </span>
          ) : (
            <button onClick={() => signIn("battlenet")} className="wow-btn text-xs">
              Link Account
            </button>
          )}
        </div>

        {/* Email */}
        <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid rgba(var(--wow-primary-rgb),0.1)" }}>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--wow-text)" }}>Email</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--wow-text-faint)" }}>{user.email ?? "—"}</p>
          </div>
        </div>

        {/* Password */}
        {hasPassword && (
          <div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--wow-text)" }}>Password</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--wow-text-faint)" }}>Change your login password</p>
              </div>
              <button onClick={() => { setShowPwForm(f => !f); setPwMsg(null); }}
                className="wow-btn-ghost text-xs">
                {showPwForm ? "Cancel" : "Change"}
              </button>
            </div>

            {showPwForm && (
              <div className="space-y-3 pt-2">
                {[
                  { label: "Current password", key: "current" as const, placeholder: "••••••••" },
                  { label: "New password", key: "next" as const, placeholder: "Min. 8 characters" },
                  { label: "Confirm new password", key: "confirm" as const, placeholder: "••••••••" },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs mb-1" style={{ color: "var(--wow-text-muted)" }}>{label}</label>
                    <input
                      type="password"
                      value={pwForm[key]}
                      placeholder={placeholder}
                      onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full rounded px-3 py-2 text-sm outline-none"
                      style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)" }}
                    />
                  </div>
                ))}
                {pwMsg && (
                  <p className="text-xs" style={{ color: pwMsg.ok ? "var(--wow-gold)" : "#e06060" }}>{pwMsg.text}</p>
                )}
                <button onClick={changePassword} disabled={pwSaving} className="wow-btn text-sm w-full">
                  {pwSaving ? "Saving…" : "Update Password"}
                </button>
              </div>
            )}
            {pwMsg && !showPwForm && (
              <p className="text-xs mt-2" style={{ color: pwMsg.ok ? "var(--wow-gold)" : "#e06060" }}>{pwMsg.text}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
