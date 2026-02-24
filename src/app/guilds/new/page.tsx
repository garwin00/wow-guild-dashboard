"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface BnetGuild { name: string; realm: string; realmSlug: string; region: string; }

export default function NewGuildPage() {
  const router = useRouter();
  const [guilds, setGuilds] = useState<BnetGuild[]>([]);
  const [realms, setRealms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualRealm, setManualRealm] = useState("");
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    fetch("/api/guilds/from-bnet")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setGuilds(data.guilds ?? []);
          setRealms(data.realms ?? []);
          if (data.realms?.length) setManualRealm(data.realms[0]);
        }
      })
      .catch(() => setError("Failed to contact Battle.net"))
      .finally(() => setLoading(false));
  }, []);

  async function selectGuild(guild: BnetGuild) {
    setCreating(guild.name);
    const res = await fetch("/api/guilds/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-white mb-1">Set up your guild</h1>
        <p className="text-gray-400 text-sm mb-6">
          We found the following guilds across your Battle.net characters.
        </p>

        {loading && (
          <div className="text-center py-10 text-gray-400">
            <div className="animate-spin text-3xl mb-3">⚙️</div>
            Fetching your guilds from Battle.net…
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-4 text-sm mb-4">
            {error}
          </div>
        )}

        {!loading && guilds.length > 0 && (
          <ul className="space-y-3 mb-4">
            {guilds.map((g) => {
              const isCreating = creating === g.name;
              return (
                <li key={`${g.name}-${g.realmSlug}`}>
                  <button
                    onClick={() => selectGuild(g)}
                    disabled={!!creating}
                    className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-5 py-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    <div>
                      <p className="text-white font-semibold">{g.name}</p>
                      <p className="text-gray-400 text-sm">{g.realm} · {g.region.toUpperCase()}</p>
                    </div>
                    {isCreating
                      ? <span className="text-blue-400 text-sm animate-pulse">Setting up…</span>
                      : <span className="text-gray-500 text-sm">Select →</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && (
          <div className="border-t border-gray-800 pt-4 mt-2">
            <button
              onClick={() => setShowManual(!showManual)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {showManual ? "▲ Hide" : "▼ Enter guild manually"}
            </button>

            {showManual && (
              <form onSubmit={submitManual} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Guild Name</label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="e.g. Team Team"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Realm (slug)</label>
                  {realms.length > 0 ? (
                    <select
                      value={manualRealm}
                      onChange={(e) => setManualRealm(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    >
                      {realms.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={manualRealm}
                      onChange={(e) => setManualRealm(e.target.value)}
                      placeholder="e.g. kazzak"
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!!creating || !manualName || !manualRealm}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
                >
                  {creating ? "Setting up…" : "Create Guild"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
