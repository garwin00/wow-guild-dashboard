"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type EventStatus = "OPEN" | "CLOSED" | "CANCELLED";
interface RaidEvent { id: string; title: string; raidZone: string; scheduledAt: string | Date; maxAttendees: number; status: EventStatus; _count: { signups: number }; }
interface Character { id: string; name: string; class: string; }

const STATUS_BADGE: Record<EventStatus, string> = {
  OPEN: "bg-green-900/50 text-green-300 border-green-700",
  CLOSED: "bg-gray-800 text-gray-400 border-gray-700",
  CANCELLED: "bg-red-900/30 text-red-400 border-red-800",
};

export default function RaidsClient({ events: initial, guildSlug, isOfficer, userCharacters }: {
  events: RaidEvent[]; guildSlug: string; isOfficer: boolean; userCharacters: Character[];
}) {
  const [events, setEvents] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", raidZone: "", scheduledAt: "", maxAttendees: "25", description: "" });
  const [saving, setSaving] = useState(false);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/raids/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, maxAttendees: parseInt(form.maxAttendees), guildSlug }),
    });
    const data = await res.json();
    if (res.ok) {
      setEvents((prev) => [...prev, { ...data, _count: { signups: 0 } }].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      ));
      setShowCreate(false);
      setForm({ title: "", raidZone: "", scheduledAt: "", maxAttendees: "25", description: "" });
    }
    setSaving(false);
  }

  const upcoming = events.filter((e) => new Date(e.scheduledAt) >= new Date() && e.status !== "CANCELLED");
  const past = events.filter((e) => new Date(e.scheduledAt) < new Date() || e.status === "CANCELLED");

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Raids</h1>
        {isOfficer && (
          <button onClick={() => setShowCreate(!showCreate)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Create Raid
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={createEvent} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 space-y-4">
          <h2 className="text-white font-semibold mb-2">New Raid Event</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Title</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Nerub-ar Palace Heroic"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Raid Zone</label>
              <input required value={form.raidZone} onChange={(e) => setForm({ ...form, raidZone: e.target.value })}
                placeholder="e.g. Nerub-ar Palace"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Date & Time</label>
              <input required type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Attendees</label>
              <input type="number" min="1" max="40" value={form.maxAttendees} onChange={(e) => setForm({ ...form, maxAttendees: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

      {/* Upcoming */}
      <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-3">Upcoming</h2>
      {upcoming.length === 0 ? (
        <p className="text-gray-600 text-sm mb-6">{isOfficer ? "No raids scheduled. Create one above." : "No upcoming raids."}</p>
      ) : (
        <div className="space-y-3 mb-8">
          {upcoming.map((event) => <EventCard key={event.id} event={event} guildSlug={guildSlug} />)}
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <>
          <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-3">Past</h2>
          <div className="space-y-3 opacity-60">
            {past.map((event) => <EventCard key={event.id} event={event} guildSlug={guildSlug} />)}
          </div>
        </>
      )}
    </div>
  );
}

function EventCard({ event, guildSlug }: { event: RaidEvent; guildSlug: string }) {
  const date = new Date(event.scheduledAt);
  const fill = Math.round((event._count.signups / event.maxAttendees) * 100);
  return (
    <Link href={`/${guildSlug}/raids/${event.id}`}
      className="block bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 hover:bg-gray-800/60 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white font-semibold">{event.title}</p>
          <p className="text-gray-400 text-sm mt-0.5">{event.raidZone} · {date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} at {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <span className={`text-xs border rounded-full px-2 py-0.5 ${STATUS_BADGE[event.status]}`}>{event.status}</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 bg-gray-800 rounded-full h-1.5">
          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(fill, 100)}%` }} />
        </div>
        <span className="text-xs text-gray-400">{event._count.signups}/{event.maxAttendees}</span>
      </div>
    </Link>
  );
}
