import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

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
    isOfficer
      ? prisma.absenceNotice.findMany({
          where: { guildId: membership.guild.id, endDate: { gte: new Date() } },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { startDate: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const attendanceMap: Record<string, { attended: number; total: number }> = {};
  if (pastRaids.length > 0) {
    const signups = await prisma.signup.findMany({
      where: { raidEventId: { in: pastRaids.map((r) => r.id) }, status: "ACCEPTED" },
      select: { characterId: true },
    });
    const attended = new Map<string, number>();
    for (const s of signups) attended.set(s.characterId, (attended.get(s.characterId) ?? 0) + 1);
    for (const c of characters) {
      attendanceMap[c.id] = { attended: attended.get(c.id) ?? 0, total: pastRaids.length };
    }
  }

  const absencesByUser: Record<string, { startDate: string; endDate: string; reason: string | null }[]> = {};
  for (const a of absences) {
    if (!absencesByUser[a.userId]) absencesByUser[a.userId] = [];
    absencesByUser[a.userId].push({
      startDate: a.startDate.toISOString(),
      endDate: a.endDate.toISOString(),
      reason: a.reason,
    });
  }

  return NextResponse.json({ characters, attendanceMap, absencesByUser });
}
