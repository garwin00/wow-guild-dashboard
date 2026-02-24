import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OverviewClient from "./OverviewClient";

interface Props {
  params: Promise<{ guildSlug: string }>;
}

export default async function OverviewPage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [membership, nextRaid, signupCount, rosterCount] = await Promise.all([
    prisma.guildMembership.findFirst({
      where: { userId: session.user.id, guild: { slug: guildSlug } },
      include: { guild: true },
    }),
    prisma.raidEvent.findFirst({
      where: { guild: { slug: guildSlug }, status: "OPEN", scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
      include: {
        _count: { select: { signups: true } },
        signups: {
          include: { character: { select: { name: true, class: true, spec: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.signup.count({
      where: { raidEvent: { guild: { slug: guildSlug } } },
    }),
    prisma.character.count({
      where: { guild: { slug: guildSlug } },
    }),
  ]);

  if (!membership) redirect("/");

  return (
    <OverviewClient
      guild={{ ...membership.guild, slug: guildSlug }}
      memberRole={membership.role}
      rosterCount={rosterCount}
      signupCount={signupCount}
      nextRaid={nextRaid ? {
        title: nextRaid.title,
        scheduledAt: nextRaid.scheduledAt.toISOString(),
        raidZone: nextRaid.raidZone,
        maxAttendees: nextRaid.maxAttendees,
        signupCount: nextRaid._count.signups,
        signups: nextRaid.signups.map(s => ({
          id: s.id,
          status: s.status,
          character: s.character,
        })),
      } : null}
    />
  );
}
