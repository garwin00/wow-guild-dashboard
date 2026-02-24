import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getGuildProgression } from "@/lib/raiderio";
import OverviewClient from "./OverviewClient";

interface Props {
  params: Promise<{ guildSlug: string }>;
}

export default async function OverviewPage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug } },
    include: { guild: true },
  });
  if (!membership) redirect("/");

  const [upcomingRaids, rosterCount, myCharacters, progression] = await Promise.all([
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
  ]);

  const nextRaid = upcomingRaids[0] ?? null;

  // Find user's own signup on the next raid (by checking any of their characters)
  const myCharacterIds = new Set(myCharacters.map(c => c.id));
  const myNextRaidSignup = nextRaid?.signups.find(s =>
    s.character && myCharacterIds.has((s as { characterId?: string }).characterId ?? "")
  ) ?? null;

  // Also fetch by character join for accuracy
  const mySignupOnNextRaid = nextRaid ? await prisma.signup.findFirst({
    where: { raidEventId: nextRaid.id, character: { userId: session.user.id } },
    include: { character: { select: { name: true } } },
  }) : null;

  return (
    <OverviewClient
      guild={{ ...membership.guild, slug: guildSlug }}
      memberRole={membership.role}
      rosterCount={rosterCount}
      myCharacters={myCharacters}
      mySignup={mySignupOnNextRaid ? {
        id: mySignupOnNextRaid.id,
        status: mySignupOnNextRaid.status,
        characterName: mySignupOnNextRaid.character?.name ?? null,
        raidEventId: mySignupOnNextRaid.raidEventId,
      } : null}
      upcomingRaids={upcomingRaids.map(r => ({
        id: r.id,
        title: r.title,
        scheduledAt: r.scheduledAt.toISOString(),
        raidZone: r.raidZone,
        maxAttendees: r.maxAttendees,
        signupCount: r._count.signups,
        signups: r.signups.map(s => ({
          id: s.id,
          status: s.status,
          characterId: (s as { characterId: string }).characterId,
          character: s.character,
        })),
      }))}
      progression={progression}
    />
  );
}
