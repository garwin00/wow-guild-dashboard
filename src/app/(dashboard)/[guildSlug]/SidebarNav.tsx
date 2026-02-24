"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavLink { href: string; label: string; icon: string }

interface Props {
  navLinks: NavLink[];
  guildName: string;
  realm: string;
  region: string;
  guildImageUrl: string | null;
  theme: string;
  signOutForm: React.ReactNode;
  progressionBadge?: string | null;
}

const THEME_SIDEBAR: Record<string, { bg: string; border: string; headerBg: string }> = {
  default: {
    bg: "linear-gradient(180deg, #0f1019 0%, #0a0b12 100%)",
    border: "1px solid rgba(var(--wow-primary-rgb),0.15)",
    headerBg: "linear-gradient(to bottom, rgba(var(--wow-primary-rgb),0.05), transparent)",
  },
  horde: {
    bg: "linear-gradient(180deg, #140808 0%, #0d0505 100%)",
    border: "1px solid rgba(180,30,30,0.2)",
    headerBg: "linear-gradient(to bottom, rgba(139,26,26,0.08), transparent)",
  },
  alliance: {
    bg: "linear-gradient(180deg, #081320 0%, #050a14 100%)",
    border: "1px solid rgba(30,80,180,0.2)",
    headerBg: "linear-gradient(to bottom, rgba(26,82,150,0.1), transparent)",
  },
};

export default function SidebarNav({ navLinks, guildName, realm, region, guildImageUrl, theme, signOutForm, progressionBadge }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const t = THEME_SIDEBAR[theme] ?? THEME_SIDEBAR.default;
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const activeColor = theme === "horde" ? "#ff4422" : theme === "alliance" ? "#7ab8f5" : "var(--wow-gold-bright)";
  const activeBg = theme === "horde" ? "rgba(139,26,26,0.15)" : theme === "alliance" ? "rgba(26,82,150,0.15)" : "rgba(var(--wow-primary-rgb),0.12)";
  const activeBorder = theme === "horde" ? "#8b1a1a" : theme === "alliance" ? "#1a5296" : "var(--wow-gold)";

  const GuildHeader = () => (
    <div className="p-4" style={{ borderBottom: t.border, background: t.headerBg }}>
      <div className="wow-divider mb-3" />
      <div className="flex items-center gap-3">
        {guildImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={guildImageUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0"
            style={{ border: `2px solid ${activeBorder}40` }} />
        ) : (
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base"
            style={{ background: `${activeBorder}20`, border: `1px solid ${activeBorder}30` }}>
            {theme === "horde" ? "🔴" : theme === "alliance" ? "🔵" : "⚔️"}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: activeColor, letterSpacing: "0.04em" }}>
            {guildName}
          </p>
          <p className="text-xs truncate mt-0.5" style={{ color: "var(--wow-text-muted)" }}>
            {realm} · {region.toUpperCase()}
          </p>
          {progressionBadge && (
            <p className="text-xs mt-0.5 font-semibold" style={{ color: "var(--wow-warning)" }}>{progressionBadge}</p>
          )}
        </div>
      </div>
      <div className="wow-divider mt-3" />
    </div>
  );

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {navLinks.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onClick}
          className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-all ${
            isActive(href) ? "border-l-2 pl-[10px]" : ""
          }`}
          style={isActive(href) ? {
            color: activeColor,
            background: activeBg,
            borderLeftColor: activeBorder,
          } : {
            color: "var(--wow-text-muted)",
          }}
          onMouseEnter={e => { if (!isActive(href)) (e.currentTarget as HTMLElement).style.color = "var(--wow-text)"; }}
          onMouseLeave={e => { if (!isActive(href)) (e.currentTarget as HTMLElement).style.color = "var(--wow-text-muted)"; }}
        >
          <span className="text-base">{icon}</span>
          <span className="text-xs tracking-widest">{label}</span>
        </Link>
      ))}
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 flex-col shrink-0" style={{ background: t.bg, borderRight: t.border }}>
        <GuildHeader />
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-3" style={{ borderTop: t.border }}>
          {signOutForm}
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
        style={{ background: "var(--wow-bg)", borderBottom: t.border }}>
        <div className="flex items-center gap-3">
          {guildImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={guildImageUrl} alt="" className="w-7 h-7 rounded-full object-cover"
              style={{ border: `1px solid ${activeBorder}40` }} />
          ) : (
            <span className="text-lg">{theme === "horde" ? "🔴" : theme === "alliance" ? "🔵" : "⚔️"}</span>
          )}
          <div>
            <p className="text-sm font-semibold truncate" style={{ color: activeColor }}>{guildName}</p>
            <p className="text-xs" style={{ color: "var(--wow-text-muted)" }}>{realm} · {region.toUpperCase()}{progressionBadge ? ` · ` : ""}{progressionBadge && <span style={{ color: "var(--wow-warning)" }}>{progressionBadge}</span>}</p>
          </div>
        </div>
        <button onClick={() => setMobileOpen((o) => !o)} className="p-2" style={{ color: activeBorder }} aria-label="Toggle menu">
          {mobileOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div className="w-64 flex flex-col pt-14" style={{ background: t.bg }}>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              <NavLinks onClick={() => setMobileOpen(false)} />
            </nav>
            <div className="p-3" style={{ borderTop: t.border }}>
              {signOutForm}
            </div>
          </div>
          <div className="flex-1 bg-black/70" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
