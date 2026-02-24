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
        <h1 className="wow-heading text-3xl font-bold" style={{ color: "#f0c040" }}>Raids</h1>
        {isOfficer && (
          <button onClick={() => setShowCreate(!showCreate)} className="wow-btn">
            + Create Raid
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={createEvent} style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.15)", borderRadius: "0.5rem", padding: "1.5rem", marginBottom: "1.5rem" }} className="space-y-4">
          <h2 style={{ color: "#e8dfc8", fontWeight: 600, marginBottom: "0.5rem" }}>New Raid Event</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs mb-1" style={{ fontFamily: "inherit", color: "#5a5040", letterSpacing: "0.05em", textTransform: "uppercase" }}>Title</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Nerub-ar Palace Heroic"
                style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)", color: "#e8dfc8", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", width: "100%", outline: "none" }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ fontFamily: "inherit", color: "#5a5040", letterSpacing: "0.05em", textTransform: "uppercase" }}>Raid Zone</label>
              <input required value={form.raidZone} onChange={(e) => setForm({ ...form, raidZone: e.target.value })}
                placeholder="e.g. Nerub-ar Palace"
                style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)", color: "#e8dfc8", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", width: "100%", outline: "none" }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ fontFamily: "inherit", color: "#5a5040", letterSpacing: "0.05em", textTransform: "uppercase" }}>Date &amp; Time</label>
              <input required type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)", color: "#e8dfc8", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", width: "100%", outline: "none" }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ fontFamily: "inherit", color: "#5a5040", letterSpacing: "0.05em", textTransform: "uppercase" }}>Max Attendees</label>
              <input type="number" min="1" max="40" value={form.maxAttendees} onChange={(e) => setForm({ ...form, maxAttendees: e.target.value })}
                style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)", color: "#e8dfc8", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", width: "100%", outline: "none" }} />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ fontFamily: "inherit", color: "#5a5040", letterSpacing: "0.05em", textTransform: "uppercase" }}>Description (optional)</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
              style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)", color: "#e8dfc8", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", width: "100%", outline: "none", resize: "none" }} />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowCreate(false)} className="wow-btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="wow-btn" style={{ opacity: saving ? 0.5 : 1 }}>
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

      {/* Upcoming */}
      <h2 style={{ color: "#5a5040", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "inherit", marginBottom: "0.75rem" }}>Upcoming</h2>
      {upcoming.length === 0 ? (
        <p style={{ color: "#5a5040", fontSize: "0.875rem", marginBottom: "1.5rem" }}>{isOfficer ? "No raids scheduled. Create one above." : "No upcoming raids."}</p>
      ) : (
        <div className="space-y-3 mb-8">
          {upcoming.map((event) => <EventCard key={event.id} event={event} guildSlug={guildSlug} />)}
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <>
          <h2 style={{ color: "#5a5040", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "inherit", marginBottom: "0.75rem" }}>Past</h2>
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
  const statusStyle: Record<EventStatus, React.CSSProperties> = {
    OPEN: { background: "rgba(64,200,100,0.12)", border: "1px solid rgba(64,200,100,0.4)", color: "#40c864" },
    CLOSED: { background: "rgba(200,169,106,0.08)", border: "1px solid rgba(200,169,106,0.25)", color: "#8a8070" },
    CANCELLED: { background: "rgba(200,64,64,0.12)", border: "1px solid rgba(200,64,64,0.4)", color: "#c84040" },
  };
  return (
    <Link href={`/${guildSlug}/raids/${event.id}`}
      className="block px-5 py-4 transition-colors"
      style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.15)", borderRadius: "0.75rem" }}
      onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(200,169,106,0.04)"; }}
      onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#0f1019"; }}>
      <div className="flex items-start justify-between">
        <div>
          <p style={{ color: "#e8dfc8", fontWeight: 600 }}>{event.title}</p>
          <p style={{ color: "#8a8070", fontSize: "0.875rem", marginTop: "0.125rem" }}>{event.raidZone} · {date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} at {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <span className="text-xs rounded-full px-2 py-0.5" style={statusStyle[event.status]}>{event.status}</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 rounded-full h-1.5" style={{ background: "#09090e" }}>
          <div className="h-1.5 rounded-full" style={{ width: `${Math.min(fill, 100)}%`, background: "#c8a96a" }} />
        </div>
        <span style={{ fontSize: "0.75rem", color: "#8a8070" }}>{event._count.signups}/{event.maxAttendees}</span>
      </div>
    </Link>
  );
}
