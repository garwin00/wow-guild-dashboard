import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";
import { getGuildProgression } from "@/lib/raiderio";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const [upcomingRaids, rosterCount, myCharacters, progression, announcements] = await Promise.all([
    prisma.raidEvent.findMany({
      where: { guildId: membership.guild.id, status: "OPEN", scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: {
        _count: { select: { signups: true } },
        signups: {
          include: { character: { select: { name: true, class: true, spec: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.character.count({ where: { guildId: membership.guild.id } }),
    prisma.character.findMany({
      where: { userId: session.user.id, guildId: membership.guild.id },
      orderBy: [{ isMain: "desc" }, { itemLevel: "desc" }],
      select: { id: true, name: true, class: true, spec: true, role: true, isMain: true },
    }),
    getGuildProgression(membership.guild.region, membership.guild.realm, membership.guild.name),
    prisma.announcement.findMany({
      where: {
        guildId: membership.guild.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { author: { select: { name: true, email: true } } },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 10,
    }),
  ]);

  const nextRaid = upcomingRaids[0] ?? null;

  const mySignup = nextRaid
    ? await prisma.signup.findFirst({
        where: { raidEventId: nextRaid.id, character: { userId: session.user.id } },
        include: { character: { select: { name: true } } },
      })
    : null;

  return NextResponse.json({
    upcomingRaids: upcomingRaids.map((r) => ({
      id: r.id,
      title: r.title,
      scheduledAt: r.scheduledAt.toISOString(),
      raidZone: r.raidZone,
      maxAttendees: r.maxAttendees,
      signupCount: r._count.signups,
      signups: r.signups.map((s) => ({
        id: s.id,
        status: s.status,
        characterId: (s as { characterId: string }).characterId,
        character: s.character,
      })),
    })),
    rosterCount,
    myCharacters,
    progression,
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      pinned: a.pinned,
      expiresAt: a.expiresAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      author: { name: a.author.name, email: a.author.email ?? "" },
    })),
    mySignup: mySignup
      ? {
          id: mySignup.id,
          status: mySignup.status,
          characterName: mySignup.character?.name ?? null,
          raidEventId: mySignup.raidEventId,
        }
      : null,
  });
}
