"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface BnetGuild { name: string; realm: string; realmSlug: string; region: string; }

const inputStyle = {
  background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)",
  color: "#e8dfc8", borderRadius: "0.375rem",
  padding: "0.5rem 0.75rem", width: "100%", fontSize: "0.875rem", outline: "none",
};
const labelStyle = {
  display: "block", fontSize: "0.75rem", marginBottom: "0.375rem",
  textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "#5a5040",
};

export default function NewGuildPage() {
  const router = useRouter();
  const [guilds, setGuilds] = useState<BnetGuild[]>([]);
  const [realms, setRealms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasBnet, setHasBnet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualRealm, setManualRealm] = useState("");
  const [showManual, setShowManual] = useState(false);

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const justLinked = searchParams?.get("bnet_linked") === "1";

  useEffect(() => {
    if (justLinked) {
      // Clear the query param cleanly
      window.history.replaceState({}, "", "/guilds/new");
    }
    fetch("/api/guilds/from-bnet")
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setHasBnet(false);
          setShowManual(true);
        } else {
          setHasBnet(true);
          setGuilds(data.guilds ?? []);
          setRealms(data.realms ?? []);
          if (data.realms?.length) setManualRealm(data.realms[0]);
          if (!data.guilds?.length) setShowManual(true);
        }
      })
      .catch(() => { setHasBnet(false); setShowManual(true); })
      .finally(() => setLoading(false));
  }, []);

  async function selectGuild(guild: BnetGuild) {
    setCreating(guild.name);
    const res = await fetch("/api/guilds/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(guild),
    });
    const data = await res.json();
    if (data.slug) router.push(`/${data.slug}/overview`);
    else { setError(data.error ?? "Failed to create guild"); setCreating(null); }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualName || !manualRealm) return;
    const region = process.env.NEXT_PUBLIC_BNET_REGION ?? "eu";
    await selectGuild({ name: manualName, realm: manualRealm, realmSlug: manualRealm.toLowerCase().replace(/\s/g, "-"), region });
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

          {loading && (
            <div className="text-center py-6" style={{ color: "#8a8070" }}>
              <div className="animate-spin text-2xl mb-2">⚙️</div>
              <p className="text-sm">Checking Battle.net…</p>
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
              <p className="text-sm font-medium" style={{ color: "#e8dfc8" }}>
                🎮 Connect Battle.net
              </p>
              <p className="text-xs" style={{ color: "#8a8070" }}>
                Link your Battle.net account to automatically import your guild and characters.
              </p>
              <button onClick={() => { window.location.href = "/api/auth/link-battlenet?returnTo=/guilds/new"; }}
                className="wow-btn w-full">
                Connect Battle.net
              </button>
            </div>
          )}

          {/* BNet guilds list */}
          {!loading && hasBnet && guilds.length > 0 && (
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

          {/* Manual entry — always available as fallback */}
          {!loading && (
            <div style={{ borderTop: "1px solid rgba(200,169,106,0.1)", paddingTop: "1.25rem" }}>
              <button onClick={() => setShowManual(!showManual)}
                className="text-sm transition-colors" style={{ color: "#8a8070" }}>
                {showManual ? "▲ Hide manual entry" : "▼ Enter guild manually"}
              </button>

              {showManual && (
                <form onSubmit={submitManual} className="mt-4 space-y-3">
                  <div>
                    <label style={labelStyle}>Guild Name</label>
                    <input type="text" value={manualName} onChange={e => setManualName(e.target.value)}
                      style={inputStyle} placeholder="e.g. Risen" required />
                  </div>
                  <div>
                    <label style={labelStyle}>Realm</label>
                    {realms.length > 0 ? (
                      <select value={manualRealm} onChange={e => setManualRealm(e.target.value)}
                        style={{ ...inputStyle, cursor: "pointer" }}>
                        {realms.map(r => <option key={r} value={r} style={{ background: "#0f1019" }}>{r}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={manualRealm} onChange={e => setManualRealm(e.target.value)}
                        style={inputStyle} placeholder="e.g. kazzak" required />
                    )}
                  </div>
                  <button type="submit" disabled={!!creating || !manualName || !manualRealm} className="wow-btn w-full">
                    {creating ? "Setting up…" : "Create Guild"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
