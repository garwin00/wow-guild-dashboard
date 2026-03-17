import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";
import { getCurrentAffixes } from "@/lib/raiderio";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const analyticsMode = req.nextUrl.searchParams.get("analytics") === "true";

  const [characters, affixes] = await Promise.all([
    prisma.character.findMany({
      where: { guildId: membership.guild.id },
      include: { mythicScore: true, mythicRuns: { orderBy: { score: "desc" }, take: analyticsMode ? 50 : 10 } },
      orderBy: [{ name: "asc" }],
    }),
    getCurrentAffixes(membership.guild.region),
  ]);

  if (!analyticsMode) {
    return NextResponse.json({ characters, affixes });
  }

  // ── Analytics mode ──────────────────────────────────────────────────────
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);

  // Flatten all runs with character info
  const allRuns = characters.flatMap((c) =>
    c.mythicRuns.map((r) => ({ ...r, characterName: c.name, characterClass: c.class }))
  );

  // Top 5 keys this week
  const thisWeekRuns = allRuns.filter((r) => new Date(r.completedAt) >= weekStart);
  const topKeysThisWeek = [...thisWeekRuns]
    .sort((a, b) => b.level - a.level)
    .slice(0, 5)
    .map((r) => ({
      dungeon: r.dungeon,
      level: r.level,
      character: r.characterName,
      characterClass: r.characterClass,
      score: r.score,
      upgrades: r.upgrades,
      completedAt: r.completedAt,
    }));

  // Infer group runs: runs within 30 min of each other on the same dungeon+level
  const groupRuns: { dungeon: string; level: number; members: { name: string; class: string }[]; completedAt: string }[] = [];
  const usedRunIds = new Set<string>();
  for (const run of thisWeekRuns) {
    if (usedRunIds.has(run.id)) continue;
    const windowMs = 30 * 60 * 1000;
    const runTime = new Date(run.completedAt).getTime();
    const teammates = thisWeekRuns.filter(
      (r) =>
        r.id !== run.id &&
        r.dungeon === run.dungeon &&
        r.level === run.level &&
        Math.abs(new Date(r.completedAt).getTime() - runTime) <= windowMs
    );
    if (teammates.length >= 1) {
      const group = [run, ...teammates];
      group.forEach((r) => usedRunIds.add(r.id));
      groupRuns.push({
        dungeon: run.dungeon,
        level: run.level,
        members: group.map((r) => ({ name: r.characterName, class: r.characterClass })),
        completedAt: run.completedAt.toString(),
      });
    }
  }

  // Score distribution buckets
  const buckets = [0, 500, 1000, 1500, 2000, 2500, 3000];
  const scoreDistribution = buckets.slice(0, -1).map((low, i) => {
    const high = buckets[i + 1];
    const count = characters.filter(
      (c) => c.mythicScore && c.mythicScore.all >= low && c.mythicScore.all < high
    ).length;
    return { label: `${low}–${high}`, count };
  });
  // 3000+ bucket
  scoreDistribution.push({
    label: "3000+",
    count: characters.filter((c) => c.mythicScore && c.mythicScore.all >= 3000).length,
  });

  // Most active this week
  const runCountMap = new Map<string, number>();
  for (const r of thisWeekRuns) {
    runCountMap.set(r.characterName, (runCountMap.get(r.characterName) ?? 0) + 1);
  }
  const mostActive = [...runCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, runs]) => {
      const char = characters.find((c) => c.name === name);
      return { name, runs, class: char?.class ?? "", score: char?.mythicScore?.all ?? 0 };
    });

  return NextResponse.json({
    characters,
    affixes,
    analytics: { topKeysThisWeek, groupRuns, scoreDistribution, mostActive },
  });
}
