import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";
import { parseWebhookEvents } from "@/lib/discord";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  if (!["GM", "OFFICER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await prisma.guildMembership.findMany({
    where: { guildId: membership.guild.id },
    include: { user: { select: { id: true, battletag: true, name: true } } },
    orderBy: { role: "asc" },
  });

  // Expand JSON webhook events into individual boolean fields for the client
  const events = parseWebhookEvents(membership.guild.discordWebhookEvents ?? null);
  return NextResponse.json({
    guild: {
      ...membership.guild,
      discordNotifyRaidCreated: events.raidCreated ?? true,
      discordNotifySignupChanged: events.signupChanged ?? true,
      discordNotifyRosterSynced: events.rosterSynced ?? true,
    },
    members,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });
  if (!["GM", "OFFICER"].includes(membership.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  // Direct scalar fields
  if ("discordWebhook" in body) updates.discordWebhook = body.discordWebhook ?? null;
  if ("imageUrl" in body) updates.imageUrl = body.imageUrl ?? null;
  if ("bannerUrl" in body) updates.bannerUrl = body.bannerUrl ?? null;
  if ("theme" in body) updates.theme = body.theme;
  if ("wclGuildId" in body) updates.wclGuildId = body.wclGuildId ?? null;

  // Merge boolean notification toggles into the single JSON field
  if ("discordNotifyRaidCreated" in body || "discordNotifySignupChanged" in body || "discordNotifyRosterSynced" in body) {
    const existing = parseWebhookEvents(membership.guild.discordWebhookEvents ?? null);
    updates.discordWebhookEvents = JSON.stringify({
      raidCreated: body.discordNotifyRaidCreated ?? existing.raidCreated ?? true,
      signupChanged: body.discordNotifySignupChanged ?? existing.signupChanged ?? true,
      rosterSynced: body.discordNotifyRosterSynced ?? existing.rosterSynced ?? true,
    });
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });

  const guild = await prisma.guild.update({ where: { id: membership.guild.id }, data: updates });
  return NextResponse.json({ guild });
}
