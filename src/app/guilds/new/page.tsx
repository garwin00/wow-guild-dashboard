"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface BnetGuild { name: string; realm: string; realmSlug: string; region: string; }

export default function NewGuildPage() {
  const router = useRouter();
  const [guilds, setGuilds] = useState<BnetGuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasBnet, setHasBnet] = useState(false);
  const [fetchingGuilds, setFetchingGuilds] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  const justLinked = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("bnet_linked") === "1";

  useEffect(() => {
    if (justLinked) window.history.replaceState({}, "", "/guilds/new");

    fetch("/api/auth/bnet-status")
      .then(r => r.json())
      .then(status => {
        if (!status.authenticated) {
          window.location.href = "/login?callbackUrl=/guilds/new";
          return;
        }
        if (!status.linked) {
          setHasBnet(false);
          setLoading(false);
          return;
        }
        setHasBnet(true);
        setFetchingGuilds(true);
        return fetch("/api/guilds/from-bnet")
          .then(r => r.json())
          .then(data => {
            setGuilds(data.guilds ?? []);
            if (data.error) setError("Could not load guilds from Battle.net.");
          })
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #1a1208 0%, #09090e 60%)" }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px"
        style={{ background: "linear-gradient(to right, transparent, #c8a96a, transparent)" }} />

      <div className="relative w-full max-w-md">
        <div className="absolute -top-px -left-px w-6 h-6 border-t border-l" style={{ borderColor: "#c8a96a" }} />
        <div className="absolute -top-px -right-px w-6 h-6 border-t border-r" style={{ borderColor: "#c8a96a" }} />
        <div className="absolute -bottom-px -left-px w-6 h-6 border-b border-l" style={{ borderColor: "#c8a96a" }} />
        <div className="absolute -bottom-px -right-px w-6 h-6 border-b border-r" style={{ borderColor: "#c8a96a" }} />

        <div className="rounded-lg p-8 space-y-6"
          style={{ background: "linear-gradient(160deg, #131520 0%, #0d0f1a 100%)", border: "1px solid rgba(200,169,106,0.2)" }}>

          <div className="text-center space-y-2">
            <span className="text-4xl">🏰</span>
            <div className="wow-divider w-24 mx-auto" />
            <h1 className="text-xl font-bold" style={{ color: "#f0c040" }}>Set Up Your Guild</h1>
          </div>

          {(loading || fetchingGuilds) && (
            <div className="text-center py-6" style={{ color: "#8a8070" }}>
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

          {/* No BNet linked — prompt to connect */}
          {!loading && !hasBnet && (
            <div className="rounded-lg p-5 text-center space-y-4"
              style={{ background: "rgba(200,169,106,0.05)", border: "1px solid rgba(200,169,106,0.2)" }}>
              <p className="text-sm font-medium" style={{ color: "#e8dfc8" }}>🎮 Connect Battle.net</p>
              <p className="text-xs" style={{ color: "#8a8070" }}>
                Link your Battle.net account to import your guilds automatically.
              </p>
              <button onClick={() => { window.location.href = "/api/auth/link-battlenet?returnTo=/guilds/new"; }}
                className="wow-btn w-full">
                Connect Battle.net
              </button>
            </div>
          )}

          {/* Guild list from BNet */}
          {!loading && !fetchingGuilds && hasBnet && guilds.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest" style={{ color: "#5a5040" }}>Your Guilds</p>
              {guilds.map(g => (
                <button key={`${g.name}-${g.realmSlug}`} onClick={() => selectGuild(g)}
                  disabled={!!creating}
                  className="w-full flex items-center justify-between rounded-lg px-4 py-3 transition-all text-left"
                  style={{
                    background: creating === g.name ? "rgba(200,169,106,0.1)" : "#0f1019",
                    border: "1px solid rgba(200,169,106,0.2)",
                    opacity: creating && creating !== g.name ? 0.5 : 1,
                    cursor: creating ? "wait" : "pointer",
                  }}>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "#e8dfc8" }}>{g.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#5a5040" }}>{g.realm} · {g.region.toUpperCase()}</p>
                  </div>
                  <span className="text-sm" style={{ color: creating === g.name ? "#c8a96a" : "#5a5040" }}>
                    {creating === g.name ? "Setting up…" : "Select →"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* BNet linked but no guilds found */}
          {!loading && !fetchingGuilds && hasBnet && guilds.length === 0 && !error && (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm" style={{ color: "#8a8070" }}>No guilds found on your Battle.net account.</p>
              <p className="text-xs" style={{ color: "#5a5040" }}>Make sure your characters are in a guild and are level 60+.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
