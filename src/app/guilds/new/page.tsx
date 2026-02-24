"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface BnetGuild { name: string; realm: string; realmSlug: string; region: string; }
interface GuildResult { id: string; name: string; realm: string; region: string; slug: string; imageUrl: string | null; _count: { memberships: number }; }

function NewGuildPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") === "join" ? "join" : "create") as "create" | "join";
  const [tab, setTab] = useState<"create" | "join">(initialTab);

  // Create tab
  const [guilds, setGuilds] = useState<BnetGuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasBnet, setHasBnet] = useState(false);
  const [fetchingGuilds, setFetchingGuilds] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  // Join tab
  const [searchName, setSearchName] = useState("");
  const [searchRealm, setSearchRealm] = useState("");
  const [searchResults, setSearchResults] = useState<GuildResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const justLinked = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("bnet_linked") === "1";

  useEffect(() => {
    if (justLinked) window.history.replaceState({}, "", "/guilds/new");
    fetch("/api/auth/bnet-status")
      .then(r => r.json())
      .then(status => {
        if (!status.authenticated) { window.location.href = "/login?callbackUrl=/guilds/new"; return; }
        if (!status.linked) { setHasBnet(false); setLoading(false); return; }
        setHasBnet(true);
        setFetchingGuilds(true);
        return fetch("/api/guilds/from-bnet")
          .then(r => r.json())
          .then(data => { setGuilds(data.guilds ?? []); if (data.error) setError("Could not load guilds from Battle.net."); })
          .finally(() => setFetchingGuilds(false));
      })
      .catch(() => setError("Failed to connect."))
      .finally(() => setLoading(false));
  }, []);

  async function selectGuild(guild: BnetGuild) {
    setCreating(guild.name);
    setError(null);
    const res = await fetch("/api/guilds/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(guild),
    });
    const data = await res.json();
    if (data.slug) router.push(`/${data.slug}/overview`);
    else { setError(data.error ?? "Failed to create guild"); setCreating(null); }
  }

  const searchGuilds = useCallback(async () => {
    if (!searchName.trim()) return;
    setSearching(true);
    setJoinError(null);
    const params = new URLSearchParams({ name: searchName, ...(searchRealm ? { realm: searchRealm } : {}) });
    const res = await fetch(`/api/guilds/search?${params}`);
    const data = await res.json();
    setSearchResults(data.guilds ?? []);
    setSearching(false);
  }, [searchName, searchRealm]);

  async function joinGuild(guildId: string) {
    setJoining(guildId);
    setJoinError(null);
    const res = await fetch("/api/guilds/join", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guildId }),
    });
    const data = await res.json();
    if (data.slug) router.push(`/${data.slug}/overview`);
    else { setJoinError(data.error ?? "Failed to join guild"); setJoining(null); }
  }

  const inputStyle = {
    background: "rgba(var(--wow-primary-rgb),0.04)",
    border: "1px solid rgba(var(--wow-primary-rgb),0.2)",
    color: "var(--wow-text)",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    outline: "none",
    width: "100%",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #1a1208 0%, #09090e 60%)" }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px"
        style={{ background: "linear-gradient(to right, transparent, #c8a96a, transparent)" }} />

      <div className="relative w-full max-w-md">
        <div className="absolute -top-px -left-px w-6 h-6 border-t border-l" style={{ borderColor: "var(--wow-gold)" }} />
        <div className="absolute -top-px -right-px w-6 h-6 border-t border-r" style={{ borderColor: "var(--wow-gold)" }} />
        <div className="absolute -bottom-px -left-px w-6 h-6 border-b border-l" style={{ borderColor: "var(--wow-gold)" }} />
        <div className="absolute -bottom-px -right-px w-6 h-6 border-b border-r" style={{ borderColor: "var(--wow-gold)" }} />

        <div className="rounded-lg p-8 space-y-6"
          style={{ background: "linear-gradient(160deg, #131520 0%, #0d0f1a 100%)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)" }}>

          <div className="text-center space-y-2">
            <span className="text-4xl">🏰</span>
            <div className="wow-divider w-24 mx-auto" />
            <h1 className="text-xl font-bold" style={{ color: "var(--wow-gold-bright)" }}>Guild Setup</h1>
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(var(--wow-primary-rgb),0.2)" }}>
            {(["create", "join"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2 text-sm font-medium transition-all"
                style={{
                  background: tab === t ? "rgba(var(--wow-primary-rgb),0.12)" : "transparent",
                  color: tab === t ? "var(--wow-gold-bright)" : "var(--wow-text-faint)",
                  fontFamily: "inherit",
                }}>
                {t === "create" ? "Create Guild" : "Join Existing"}
              </button>
            ))}
          </div>

          {/* ── Create tab ── */}
          {tab === "create" && (
            <>
              {(loading || fetchingGuilds) && (
                <div className="text-center py-6" style={{ color: "var(--wow-text-muted)" }}>
                  <div className="animate-spin text-2xl mb-2">⚙️</div>
                  <p className="text-sm">{loading ? "Checking Battle.net…" : "Loading your guilds…"}</p>
                </div>
              )}
              {error && (
                <div className="rounded px-4 py-3 text-sm"
                  style={{ background: "rgba(200,50,50,0.1)", border: "1px solid rgba(200,50,50,0.3)", color: "#f08080" }}>
                  {error}
                </div>
              )}
              {!loading && !hasBnet && (
                <div className="rounded-lg p-5 text-center space-y-4"
                  style={{ background: "rgba(var(--wow-primary-rgb),0.05)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--wow-text)" }}>🎮 Connect Battle.net</p>
                  <p className="text-xs" style={{ color: "var(--wow-text-muted)" }}>
                    Link your Battle.net account to import your guilds automatically.
                  </p>
                  <button onClick={() => { window.location.href = "/api/auth/link-battlenet?returnTo=/guilds/new"; }}
                    className="wow-btn w-full">Connect Battle.net</button>
                </div>
              )}
              {!loading && !fetchingGuilds && hasBnet && guilds.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest" style={{ color: "var(--wow-text-faint)" }}>Your Guilds</p>
                  {guilds.map(g => (
                    <button key={`${g.name}-${g.realmSlug}`} onClick={() => selectGuild(g)}
                      disabled={!!creating}
                      className="w-full flex items-center justify-between rounded-lg px-4 py-3 transition-all text-left"
                      style={{
                        background: creating === g.name ? "rgba(var(--wow-primary-rgb),0.1)" : "var(--wow-surface)",
                        border: "1px solid rgba(var(--wow-primary-rgb),0.2)",
                        opacity: creating && creating !== g.name ? 0.5 : 1,
                        cursor: creating ? "wait" : "pointer",
                      }}>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "var(--wow-text)" }}>{g.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--wow-text-faint)" }}>{g.realm} · {g.region.toUpperCase()}</p>
                      </div>
                      <span className="text-sm" style={{ color: creating === g.name ? "var(--wow-gold)" : "var(--wow-text-faint)" }}>
                        {creating === g.name ? "Setting up…" : "Select →"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {!loading && !fetchingGuilds && hasBnet && guilds.length === 0 && !error && (
                <div className="text-center py-4 space-y-2">
                  <p className="text-sm" style={{ color: "var(--wow-text-muted)" }}>No guilds found on your Battle.net account.</p>
                  <p className="text-xs" style={{ color: "var(--wow-text-faint)" }}>Make sure your characters are in a guild and are level 60+.</p>
                </div>
              )}
            </>
          )}

          {/* ── Join tab ── */}
          {tab === "join" && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: "var(--wow-text-muted)" }}>
                Search for a guild that already uses ZugZug and request to join as a member.
              </p>
              <div className="space-y-2">
                <input value={searchName} onChange={e => setSearchName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchGuilds()}
                  placeholder="Guild name…" style={inputStyle} />
                <input value={searchRealm} onChange={e => setSearchRealm(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchGuilds()}
                  placeholder="Realm (optional)…" style={inputStyle} />
                <button onClick={searchGuilds} disabled={searching || !searchName.trim()} className="wow-btn w-full"
                  style={{ opacity: !searchName.trim() || searching ? 0.5 : 1 }}>
                  {searching ? "Searching…" : "Search Guilds"}
                </button>
              </div>

              {joinError && (
                <p className="text-sm" style={{ color: "#f08080" }}>{joinError}</p>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map(g => (
                    <div key={g.id} className="flex items-center justify-between rounded-lg px-4 py-3"
                      style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)" }}>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "var(--wow-text)" }}>{g.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--wow-text-faint)" }}>
                          {g.realm} · {g.region.toUpperCase()} · {g._count.memberships} members
                        </p>
                      </div>
                      <button onClick={() => joinGuild(g.id)} disabled={!!joining}
                        className="text-xs px-3 py-1.5 rounded transition-all"
                        style={{
                          background: "rgba(var(--wow-primary-rgb),0.08)",
                          border: "1px solid rgba(var(--wow-primary-rgb),0.3)",
                          color: joining === g.id ? "var(--wow-text-muted)" : "var(--wow-gold)",
                          opacity: joining && joining !== g.id ? 0.5 : 1,
                        }}>
                        {joining === g.id ? "Joining…" : "Join →"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.length === 0 && !searching && searchName && (
                <p className="text-sm text-center py-2" style={{ color: "var(--wow-text-faint)" }}>No guilds found. Try a different name.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewGuildPage() {
  return (
    <Suspense>
      <NewGuildPageInner />
    </Suspense>
  );
}
