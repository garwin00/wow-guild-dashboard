import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RosterClient from "./RosterClient";

interface Props { params: Promise<{ guildSlug: string }> }

export default async function RosterPage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug } },
    include: { guild: true },
  });
  if (!membership) redirect("/");

  const isOfficer = ["GM", "OFFICER"].includes(membership.role);

  const [characters, pastRaids, absences] = await Promise.all([
    prisma.character.findMany({
      where: { guildId: membership.guild.id },
      orderBy: [{ guildRank: "asc" }, { name: "asc" }],
    }),
    prisma.raidEvent.findMany({
      where: { guildId: membership.guild.id, scheduledAt: { lt: new Date() } },
      orderBy: { scheduledAt: "desc" },
      take: 10,
      select: { id: true },
    }),
    // Active/upcoming absences for all members (officers see all)
    isOfficer ? prisma.absenceNotice.findMany({
      where: { guildId: membership.guild.id, endDate: { gte: new Date() } },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { startDate: "asc" },
    }) : Promise.resolve([]),
  ]);

  // Build attendance map: characterId → { attended, total }
  const attendanceMap: Record<string, { attended: number; total: number }> = {};
  if (pastRaids.length > 0) {
    const signups = await prisma.signup.findMany({
      where: { raidEventId: { in: pastRaids.map(r => r.id) }, status: "ACCEPTED" },
      select: { characterId: true },
    });
    const attended = new Map<string, number>();
    for (const s of signups) attended.set(s.characterId, (attended.get(s.characterId) ?? 0) + 1);
    for (const c of characters) {
      attendanceMap[c.id] = { attended: attended.get(c.id) ?? 0, total: pastRaids.length };
    }
  }

  // Build userId → absences map for quick lookup
  const absencesByUser: Record<string, { startDate: Date; endDate: Date; reason: string | null }[]> = {};
  for (const a of absences) {
    if (!absencesByUser[a.userId]) absencesByUser[a.userId] = [];
    absencesByUser[a.userId].push({ startDate: a.startDate, endDate: a.endDate, reason: a.reason });
  }

  return (
    <RosterClient
      characters={characters}
      guildSlug={guildSlug}
      isOfficer={isOfficer}
      guildName={membership.guild.name}
      attendanceMap={attendanceMap}
      absencesByUser={absencesByUser}
      currentUserId={session.user.id}
    />
  );
}
