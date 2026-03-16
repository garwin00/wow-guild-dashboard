"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { classColor } from "@/lib/wow-constants";

interface LootRecord {
  id: string;
  itemName: string;
  itemLevel: number;
  bossName: string | null;
  source: string;
  awardedAt: string;
  character: { id: string; name: string; class: string };
  raidEvent: { id: string; title: string } | null;
}

interface LootResponse {
  records: LootRecord[];
  total: number;
  page: number;
  pageSize: number;
}

const iLvlColour = (ilvl: number) => {
  if (ilvl >= 639) return "#e268a8"; // mythic
  if (ilvl >= 626) return "#a335ee"; // heroic
  if (ilvl >= 606) return "#0070dd"; // normal
  return "var(--wow-text-muted)";
};

function LogLootModal({
  guildSlug,
  onClose,
}: {
  guildSlug: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [charName, setCharName] = useState("");
  const [itemName, setItemName] = useState("");
  const [ilvl, setIlvl] = useState("");
  const [boss, setBoss] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: object) => {
      const res = await fetch(`/api/guild/${guildSlug}/loot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loot", guildSlug] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="rounded-lg p-6 w-full max-w-md space-y-4"
        style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.3)" }}>
        <h2 className="text-lg font-semibold" style={{ color: "var(--wow-gold-bright)" }}>Log Loot</h2>

        <div className="space-y-3">
          {[
            { label: "Character Name", value: charName, set: setCharName, placeholder: "Thrall" },
            { label: "Item Name", value: itemName, set: setItemName, placeholder: "Ashkandur, Fall of the Brotherhood" },
            { label: "Item Level", value: ilvl, set: setIlvl, placeholder: "639", type: "number" },
            { label: "Boss Name", value: boss, set: setBoss, placeholder: "Fyrakk the Blazing (optional)" },
          ].map(({ label, value, set, placeholder, type }) => (
            <div key={label}>
              <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "var(--wow-text-faint)" }}>{label}</label>
              <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                type={type ?? "text"}
                className="w-full rounded px-3 py-2 text-sm outline-none"
                style={{ background: "var(--wow-bg)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)" }} />
            </div>
          ))}
        </div>

        {error && <p className="text-sm" style={{ color: "#e06060" }}>{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded text-sm"
            style={{ background: "rgba(var(--wow-primary-rgb),0.1)", color: "var(--wow-text-muted)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)" }}>
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate({ characterName: charName, itemName, itemLevel: Number(ilvl), bossName: boss || null })}
            disabled={mutation.isPending || !charName || !itemName || !ilvl}
            className="flex-1 wow-btn text-sm">
            {mutation.isPending ? "Logging…" : "Log Loot"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LootClient({ guildSlug, isOfficer }: { guildSlug: string; isOfficer: boolean }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const PAGE_SIZE = 20;

  const { data, isLoading } = useQuery<LootResponse>({
    queryKey: ["loot", guildSlug, page, filter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (filter) params.set("search", filter);
      return fetch(`/api/guild/${guildSlug}/loot?${params}`).then(r => r.json());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/guild/${guildSlug}/loot/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["loot", guildSlug] }),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl wow-heading" style={{ color: "var(--wow-gold-bright)" }}>Loot History</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--wow-text-faint)" }}>
            {data?.total ?? "—"} records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}
            placeholder="Search character or item…"
            className="rounded px-3 py-1.5 text-sm outline-none"
            style={{ background: "var(--wow-surface)", border: "1px solid rgba(var(--wow-primary-rgb),0.2)", color: "var(--wow-text)", width: 220 }} />
          {isOfficer && (
            <button onClick={() => setShowModal(true)} className="wow-btn text-sm">⚔️ Log Loot</button>
          )}
        </div>
      </div>

      {showModal && <LogLootModal guildSlug={guildSlug} onClose={() => setShowModal(false)} />}

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "rgba(var(--wow-primary-rgb),0.08)", borderBottom: "1px solid rgba(var(--wow-primary-rgb),0.15)" }}>
              {["Date", "Character", "Item", "iLvl", "Boss", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-widest font-semibold"
                  style={{ color: "var(--wow-text-faint)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "var(--wow-text-faint)" }}>Loading…</td></tr>
            ) : !data?.records.length ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "var(--wow-text-faint)" }}>No loot records yet.</td></tr>
            ) : data.records.map((r, i) => (
              <tr key={r.id} style={{ borderTop: i > 0 ? "1px solid rgba(var(--wow-primary-rgb),0.08)" : undefined }}>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--wow-text-faint)" }}>
                  {new Date(r.awardedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: classColor(r.character.class) }}>
                  {r.character.name}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--wow-text)" }}>{r.itemName}</td>
                <td className="px-4 py-3 font-mono font-bold text-xs" style={{ color: iLvlColour(r.itemLevel) }}>
                  {r.itemLevel}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--wow-text-muted)" }}>
                  {r.bossName ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {isOfficer && (
                    <button onClick={() => deleteMutation.mutate(r.id)}
                      className="text-xs opacity-40 hover:opacity-100 transition-opacity"
                      style={{ color: "#e06060" }}>✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="wow-btn text-xs disabled:opacity-40">← Prev</button>
          <span className="text-sm" style={{ color: "var(--wow-text-faint)" }}>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="wow-btn text-xs disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
