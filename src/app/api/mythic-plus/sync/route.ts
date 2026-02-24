import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCharacterMythicPlus } from "@/lib/raiderio";

// Chunk array into groups of n
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

type CharRow = { id: string; name: string; realm: string; region: string };

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { guildSlug } = await req.json();
  if (!guildSlug) return NextResponse.json({ error: "guildSlug required" }, { status: 400 });

  const guild = await prisma.guild.findUnique({ where: { slug: guildSlug } });
  if (!guild) return NextResponse.json({ error: "Guild not found" }, { status: 404 });

  const characters = await prisma.character.findMany({
    where: { guildId: guild.id },
    select: { id: true, name: true, realm: true, region: true },
  }) satisfies { id: string; name: string; realm: string; region: string }[];

  let synced = 0;
  let failed = 0;

  for (const batch of chunk<CharRow>(characters, 10)) {
    await Promise.all(
      batch.map(async (char: CharRow) => {
        try {
          const profile = await getCharacterMythicPlus(char.region, char.realm, char.name);
          if (!profile) { failed++; return; }

          const currentSeason = profile.mythic_plus_scores_by_season?.[0];
          const scores = currentSeason?.scores ?? { all: 0, dps: 0, healer: 0, tank: 0 };

          await prisma.mythicPlusScore.upsert({
            where: { characterId: char.id },
            update: {
              all: scores.all,
              dps: scores.dps,
              healer: scores.healer,
              tank: scores.tank,
              season: currentSeason?.season ?? "current",
            },
            create: {
              characterId: char.id,
              guildId: guild.id,
              season: currentSeason?.season ?? "current",
              all: scores.all,
              dps: scores.dps,
              healer: scores.healer,
              tank: scores.tank,
            },
          });

          // Upsert top best runs
          const runs = profile.mythic_plus_best_runs ?? [];
          for (const run of runs.slice(0, 10)) {
            await prisma.mythicPlusRun.upsert({
              where: {
                characterId_dungeon_level_completedAt: {
                  characterId: char.id,
                  dungeon: run.dungeon,
                  level: run.mythic_level,
                  completedAt: new Date(run.completed_at),
                },
              },
              update: {
                score: run.score,
                upgrades: run.num_keystone_upgrades,
                url: run.url,
                affixes: run.affixes.map((a) => a.name),
                isTank: !!run.tank,
                isHealer: !!run.healer,
              },
              create: {
                characterId: char.id,
                dungeon: run.dungeon,
                shortName: run.short_name,
                level: run.mythic_level,
                score: run.score,
                completedAt: new Date(run.completed_at),
                upgrades: run.num_keystone_upgrades,
                url: run.url,
                affixes: run.affixes.map((a) => a.name),
                isTank: !!run.tank,
                isHealer: !!run.healer,
              },
            });
          }

          synced++;
        } catch (e) {
          console.error(`[mplus sync] failed for ${char.name}:`, e);
          failed++;
        }
      })
    );
  }

  return NextResponse.json({ synced, failed, total: characters.length });
}
