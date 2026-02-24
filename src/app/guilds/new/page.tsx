"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface BnetGuild {
  name: string;
  realm: string;
  realmSlug: string;
  region: string;
}

export default function NewGuildPage() {
  const router = useRouter();
  const [guilds, setGuilds] = useState<BnetGuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/guilds/from-bnet")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setGuilds(data.guilds ?? []);
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
    if (data.slug) {
      router.push(`/${data.slug}/overview`);
    } else {
      setError(data.error ?? "Failed to create guild");
      setCreating(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-white mb-1">Set up your guild</h1>
        <p className="text-gray-400 text-sm mb-6">
          We found the following guilds across your Battle.net characters. Pick the one you want to manage.
        </p>

        {loading && (
          <div className="text-center py-10 text-gray-400">
            <div className="animate-spin text-3xl mb-3">⚙️</div>
            Fetching your guilds from Battle.net…
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && guilds.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p>No guilds found on your Battle.net account.</p>
            <p className="text-sm mt-1 text-gray-500">Make sure your characters are in a guild and your API client has <code>wow.profile</code> scope.</p>
          </div>
        )}

        {!loading && guilds.length > 0 && (
          <ul className="space-y-3">
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
                    {isCreating ? (
                      <span className="text-blue-400 text-sm animate-pulse">Setting up…</span>
                    ) : (
                      <span className="text-gray-500 text-sm">Select →</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
