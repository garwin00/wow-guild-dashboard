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
  signOutForm: React.ReactNode;
}

export default function SidebarNav({ navLinks, guildName, realm, region, signOutForm }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {navLinks.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onClick}
          className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-all ${
            isActive(href)
              ? "text-[#f0c040] bg-[rgba(200,169,106,0.12)] border-l-2 border-[#c8a96a] pl-[10px]"
              : "text-[#8a8070] hover:text-[#e8dfc8] hover:bg-[rgba(200,169,106,0.06)]"
          }`}
        >
          <span className="text-base">{icon}</span>
          <span style={{ fontFamily: "var(--font-cinzel), serif", fontSize: "0.75rem", letterSpacing: "0.05em" }}>
            {label}
          </span>
        </Link>
      ))}
    </>
  );

  const sidebarStyle = {
    background: "linear-gradient(180deg, #0f1019 0%, #0a0b12 100%)",
    borderRight: "1px solid rgba(200,169,106,0.15)",
  };

  const headerStyle = {
    borderBottom: "1px solid rgba(200,169,106,0.15)",
    background: "linear-gradient(to bottom, rgba(200,169,106,0.05), transparent)",
  };

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 flex-col shrink-0" style={sidebarStyle}>
        <div className="p-4" style={headerStyle}>
          {/* Decorative top line */}
          <div className="wow-divider mb-3" />
          <p className="text-sm font-semibold truncate" style={{ fontFamily: "var(--font-cinzel), serif", color: "#f0c040", letterSpacing: "0.04em" }}>
            {guildName}
          </p>
          <p className="text-xs truncate mt-0.5" style={{ color: "#5a5040" }}>
            {realm} · {region.toUpperCase()}
          </p>
          <div className="wow-divider mt-3" />
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-3" style={{ borderTop: "1px solid rgba(200,169,106,0.1)" }}>
          {signOutForm}
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
        style={{ background: "#0a0b12", borderBottom: "1px solid rgba(200,169,106,0.2)" }}>
        <div>
          <p className="text-sm font-semibold truncate" style={{ fontFamily: "var(--font-cinzel), serif", color: "#f0c040" }}>
            {guildName}
          </p>
          <p className="text-xs" style={{ color: "#5a5040" }}>{realm} · {region.toUpperCase()}</p>
        </div>
        <button onClick={() => setMobileOpen((o) => !o)} className="p-2" style={{ color: "#c8a96a" }} aria-label="Toggle menu">
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
          <div className="w-64 flex flex-col pt-14" style={sidebarStyle}>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              <NavLinks onClick={() => setMobileOpen(false)} />
            </nav>
            <div className="p-3" style={{ borderTop: "1px solid rgba(200,169,106,0.1)" }}>{signOutForm}</div>
          </div>
          <div className="flex-1 bg-black/70" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
