"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { scoreColor } from "@/lib/raiderio";

const CLASS_COLORS: Record<string, string> = {
  "death knight": "#C41E3A", "demon hunter": "#A330C9", druid: "#FF7C0A",
  evoker: "#33937F", hunter: "#AAD372", mage: "#3FC7EB", monk: "#00FF98",
  paladin: "#F48CBA", priest: "#FFFFFF", rogue: "#FFF468", shaman: "#0070DD",
  warlock: "#8788EE", warrior: "#C69B3A",
};
function classColor(cls: string | null) { return CLASS_COLORS[cls?.toLowerCase() ?? ""] ?? "#9d9d9d"; }

const ROLE_ICON: Record<string, string> = { TANK: "🛡️", HEALER: "💚", DPS: "⚔️" };
const ROLE_BADGE: Record<string, string> = { GM: "👑 GM", OFFICER: "⭐ Officer", MEMBER: "🗡️ Member" };

interface Character {
  id: string;
  name: string;
  realm: string;
  region: string;
  class: string;
  spec: string | null;
  role: string;
  itemLevel: number | null;
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

function CharCard({ char, isMain, onSetMain, pending }: {
  char: Character; isMain: boolean; onSetMain: () => void; pending: boolean;
}) {
  const color = classColor(char.class);
  return (
    <div className={`rounded-lg p-4 transition-all ${!isMain ? "cursor-pointer" : ""}`}
      style={{
        background: isMain ? "rgba(200,169,106,0.08)" : "#0f1019",
        border: isMain ? `2px solid ${color}60` : "1px solid rgba(200,169,106,0.15)",
        boxShadow: isMain ? `0 0 20px ${color}20` : "none",
      }}
      onClick={!isMain ? onSetMain : undefined}>

      <div className="flex items-center gap-3 mb-3">
        {char.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={char.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover"
            style={{ boxShadow: `0 0 0 2px ${color}60` }} />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ background: `${color}20`, color }}>
            {char.name[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm truncate" style={{ color }}>{char.name}</p>
            {isMain && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>Main</span>}
          </div>
          <p className="text-xs truncate" style={{ color: "#8a8070" }}>
            {char.spec ? `${char.spec} ` : ""}{char.class}
          </p>
        </div>
        <span className="text-base">{ROLE_ICON[char.role] ?? "⚔️"}</span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span style={{ color: "#5a5040" }}>{char.realm}</span>
        <div className="flex items-center gap-2">
          {char.itemLevel && <span style={{ color: "#e8dfc8" }}>{char.itemLevel} iLvl</span>}
          {char.mythicScore && (
            <span className="font-bold" style={{ color: scoreColor(char.mythicScore) }}>{char.mythicScore.toFixed(0)}</span>
          )}
        </div>
      </div>

      {char.guildName && (
        <p className="text-xs mt-1.5" style={{ color: "#5a5040" }}>
          &lt;{char.guildName}&gt;
        </p>
      )}

      {!isMain && (
        <p className="text-xs mt-2 text-center" style={{ color: pending ? "#5a5040" : "#c8a96a" }}>
          {pending ? "Setting…" : "Tap to set as main"}
        </p>
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
  const [linkMsg, setLinkMsg] = useState<string | null>(null);

  const mainChar = chars.find(c => c.isMain) ?? chars[0] ?? null;
  const alts = chars.filter(c => c.id !== mainChar?.id);
  const hasBnet = !user.bnetId.startsWith("email:");

  async function setMain(charId: string) {
    setSettingMain(charId);
    await fetch("/api/characters/set-main", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: charId }),
    });
    setChars(prev => prev.map(c => ({ ...c, isMain: c.id === charId })));
    setSettingMain(null);
    startTransition(() => router.refresh());
  }

  async function syncChars() {
    setLinking(true);
    setLinkMsg(null);
    const res = await fetch("/api/roster/link-characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guildSlug }),
    });
    const data = await res.json();
    setLinkMsg(data.error ?? `✓ Linked ${data.linked} character(s)`);
    setLinking(false);
    if (data.linked > 0) startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl wow-heading" style={{ color: "#f0c040" }}>Profile</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {hasBnet ? (
              <p className="text-sm font-medium" style={{ color: "#e8dfc8" }}>{user.battletag}</p>
            ) : (
              <p className="text-sm" style={{ color: "#8a8070" }}>{user.email}</p>
            )}
            <span className="text-xs px-2 py-0.5 rounded"
              style={{ background: "rgba(200,169,106,0.1)", border: "1px solid rgba(200,169,106,0.2)", color: "#c8a96a" }}>
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
        <div className="px-4 py-2 rounded text-sm" style={{ background: "rgba(200,169,106,0.08)", border: "1px solid rgba(200,169,106,0.25)", color: "#c8a96a" }}>
          {linkMsg}
        </div>
      )}

      {chars.length === 0 ? (
        <div className="rounded-lg p-8 text-center" style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.15)" }}>
          <p className="text-sm mb-3" style={{ color: "#8a8070" }}>No characters linked yet.</p>
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
          {/* Main character — large card */}
          {mainChar && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#5a5040" }}>Main Character</p>
              <div className="rounded-lg p-6" style={{
                background: "rgba(200,169,106,0.05)",
                border: `2px solid ${classColor(mainChar.class)}50`,
                boxShadow: `0 0 30px ${classColor(mainChar.class)}15`,
              }}>
                <div className="flex items-center gap-5">
                  {mainChar.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mainChar.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover"
                      style={{ boxShadow: `0 0 0 3px ${classColor(mainChar.class)}60` }} />
                  ) : (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl"
                      style={{ background: `${classColor(mainChar.class)}20`, color: classColor(mainChar.class) }}>
                      {mainChar.name[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-2xl font-bold" style={{ color: classColor(mainChar.class) }}>{mainChar.name}</p>
                    <p className="text-sm mt-0.5" style={{ color: "#8a8070" }}>
                      {mainChar.spec ? `${mainChar.spec} ` : ""}{mainChar.class} · {mainChar.realm}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      {mainChar.itemLevel && <span className="text-sm font-medium" style={{ color: "#e8dfc8" }}>{mainChar.itemLevel} iLvl</span>}
                      {mainChar.mythicScore && (
                        <span className="text-sm font-bold" style={{ color: scoreColor(mainChar.mythicScore) }}>
                          {mainChar.mythicScore.toFixed(1)} M+
                        </span>
                      )}
                      <span>{ROLE_ICON[mainChar.role] ?? "⚔️"}</span>
                    </div>
                    {mainChar.guildName && (
                      <p className="text-xs mt-1" style={{ color: "#5a5040" }}>&lt;{mainChar.guildName}&gt;</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alts grid */}
          {alts.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#5a5040" }}>
                Alts ({alts.length}) — tap to set as main
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {alts.map(char => (
                  <CharCard
                    key={char.id}
                    char={char}
                    isMain={false}
                    onSetMain={() => setMain(char.id)}
                    pending={settingMain === char.id || isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
