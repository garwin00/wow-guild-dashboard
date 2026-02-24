import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWowProfile, getCharacterProfile } from "@/lib/blizzard";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const region = process.env.BLIZZARD_REGION ?? "eu";

  const jwtToken = (session as { bnetAccessToken?: string }).bnetAccessToken;
  let accessToken: string | undefined = jwtToken;

  if (!accessToken) {
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "battlenet" },
    });
    accessToken = account?.access_token ?? undefined;
  }

  if (!accessToken) {
    return NextResponse.json({ error: "No Battle.net token found" }, { status: 400 });
  }

  try {
    const profile = await getUserWowProfile(region, accessToken);
    const allChars: { name: string; realmSlug: string; level: number }[] = [];

    for (const wowAccount of profile?.wow_accounts ?? []) {
      for (const character of wowAccount?.characters ?? []) {
        allChars.push({
          name: character.name,
          realmSlug: character.realm?.slug,
          level: character.level ?? 0,
        });
      }
    }

    // Sort by level desc, take top 8 to limit API calls
    const topChars = allChars
      .filter((c) => c.level >= 60 && c.realmSlug)
      .sort((a, b) => b.level - a.level)
      .slice(0, 8);

    // Fetch individual profiles in parallel
    const profiles = await Promise.allSettled(
      topChars.map((c) =>
        getCharacterProfile(region, c.realmSlug, c.name, accessToken!)
      )
    );

    // Deduplicate guilds
    const guildsMap = new Map<string, { name: string; realm: string; realmSlug: string; region: string }>();
    for (const result of profiles) {
      if (result.status !== "fulfilled") continue;
      const guild = result.value?.guild;
      if (!guild) continue;
      const key = `${guild.name}-${guild.realm?.slug}`;
      if (!guildsMap.has(key)) {
        guildsMap.set(key, {
          name: guild.name,
          realm: guild.realm?.name ?? guild.realm?.slug,
          realmSlug: guild.realm?.slug,
          region,
        });
      }
    }

    // Also return character realms for manual entry fallback
    const realms = [...new Set(topChars.map((c) => c.realmSlug))];

    return NextResponse.json({
      guilds: Array.from(guildsMap.values()),
      realms,
    });
  } catch (err) {
    console.error("Blizzard API error:", err);
    return NextResponse.json({ error: "Failed to fetch from Battle.net" }, { status: 500 });
  }
}
