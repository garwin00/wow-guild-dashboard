import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const isOfficer = ["GM", "OFFICER"].includes(membership.role);
  const historyMode = req.nextUrl.searchParams.get("history") === "true";
  const raidLimit = historyMode ? 20 : 10;

  const [characters, pastRaids, absences] = await Promise.all([
    prisma.character.findMany({
      where: { guildId: membership.guild.id },
      orderBy: [{ guildRank: "asc" }, { name: "asc" }],
    }),
    prisma.raidEvent.findMany({
      where: { guildId: membership.guild.id, scheduledAt: { lt: new Date() } },
      orderBy: { scheduledAt: "desc" },
      take: raidLimit,
      select: { id: true, title: true, scheduledAt: true },
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
  let attendanceHistory: Record<string, { raidId: string; title: string; date: string; attended: boolean }[]> = {};

  if (pastRaids.length > 0) {
    const signups = await prisma.signup.findMany({
      where: { raidEventId: { in: pastRaids.map((r) => r.id) }, status: "ACCEPTED" },
      select: { characterId: true, raidEventId: true },
    });

    const signupSet = new Set(signups.map((s) => `${s.characterId}:${s.raidEventId}`));
    const attended = new Map<string, number>();
    for (const s of signups) attended.set(s.characterId, (attended.get(s.characterId) ?? 0) + 1);

    for (const c of characters) {
      attendanceMap[c.id] = { attended: attended.get(c.id) ?? 0, total: pastRaids.length };
      if (historyMode) {
        attendanceHistory[c.id] = pastRaids.map((r) => ({
          raidId: r.id,
          title: r.title,
          date: r.scheduledAt.toISOString(),
          attended: signupSet.has(`${c.id}:${r.id}`),
        }));
      }
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

  // Build membershipMap keyed by userId for trial tracking in the UI
  const allMemberships = await prisma.guildMembership.findMany({
    where: { guildId: membership.guild.id },
    select: { id: true, userId: true, role: true, trialStartDate: true, trialReviewDate: true },
  });
  const membershipMap: Record<string, { id: string; role: string; trialStartDate: string | null; trialReviewDate: string | null }> = {};
  for (const m of allMemberships) {
    membershipMap[m.userId] = {
      id: m.id,
      role: m.role,
      trialStartDate: m.trialStartDate?.toISOString() ?? null,
      trialReviewDate: m.trialReviewDate?.toISOString() ?? null,
    };
  }

  return NextResponse.json({
    guildId: membership.guild.id,
    characters,
    attendanceMap,
    absencesByUser,
    membershipMap,
    ...(historyMode ? { attendanceHistory, raids: pastRaids } : {}),
  });
}
