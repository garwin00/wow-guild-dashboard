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

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 bg-gray-900 border-r border-gray-800 flex-col shrink-0">
        <div className="p-4 border-b border-gray-800">
          <p className="text-white font-bold truncate">{guildName}</p>
          <p className="text-gray-400 text-xs truncate">{realm} · {region.toUpperCase()}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navLinks.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive(href)
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-800">{signOutForm}</div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 h-14">
        <div>
          <p className="text-white font-bold text-sm truncate">{guildName}</p>
          <p className="text-gray-400 text-xs">{realm} · {region.toUpperCase()}</p>
        </div>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="p-2 text-gray-300 hover:text-white"
          aria-label="Toggle menu"
        >
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
          <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col pt-14">
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navLinks.map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive(href)
                      ? "bg-gray-800 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span>{icon}</span>
                  {label}
                </Link>
              ))}
            </nav>
            <div className="p-3 border-t border-gray-800">{signOutForm}</div>
          </div>
          {/* Backdrop */}
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
