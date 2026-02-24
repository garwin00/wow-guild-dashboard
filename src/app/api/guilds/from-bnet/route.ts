import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWowProfile } from "@/lib/blizzard";

// GET /api/guilds/from-bnet
// Returns deduplicated list of guilds found across all the user's characters
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "battlenet" },
  });

  if (!account?.access_token) {
    return NextResponse.json({ error: "No Battle.net token found" }, { status: 400 });
  }

  const region = process.env.BLIZZARD_REGION ?? "eu";

  try {
    const profile = await getUserWowProfile(region, account.access_token);

    const guildsMap = new Map<string, { name: string; realm: string; realmSlug: string; region: string }>();

    for (const wowAccount of profile?.wow_accounts ?? []) {
      for (const character of wowAccount?.characters ?? []) {
        const guild = character?.guild;
        if (!guild) continue;
        const key = `${guild.name}-${character.realm?.slug}`;
        if (!guildsMap.has(key)) {
          guildsMap.set(key, {
            name: guild.name,
            realm: character.realm?.name ?? character.realm?.slug ?? "",
            realmSlug: character.realm?.slug ?? "",
            region,
          });
        }
      }
    }

    return NextResponse.json({ guilds: Array.from(guildsMap.values()) });
  } catch (err) {
    console.error("Blizzard API error:", err);
    return NextResponse.json({ error: "Failed to fetch from Battle.net" }, { status: 500 });
  }
}
