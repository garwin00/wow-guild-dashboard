import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWowProfile } from "@/lib/blizzard";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { guildSlug } = await req.json();

  // Get the user's Battle.net access token
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "battlenet" },
    select: { access_token: true },
  });
  if (!account?.access_token) {
    return NextResponse.json({ error: "No Battle.net token found. Please sign out and sign in again." }, { status: 400 });
  }

  // Get the guild
  const guild = await prisma.guild.findUnique({ where: { slug: guildSlug } });
  if (!guild) return NextResponse.json({ error: "Guild not found" }, { status: 404 });

  // Verify user is a guild member
  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guildId: guild.id },
  });
  if (!membership) return NextResponse.json({ error: "Not a member of this guild" }, { status: 403 });

  // Fetch the user's WoW characters from Battle.net
  let wowProfile: { wow_accounts?: { characters?: { name: string; realm: { slug: string } }[] }[] };
  try {
    wowProfile = await getUserWowProfile(guild.region, account.access_token);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch WoW profile from Battle.net" }, { status: 502 });
  }

  // Flatten all characters across all WoW accounts
  const bnetChars = wowProfile.wow_accounts?.flatMap(a => a.characters ?? []) ?? [];

  let linked = 0;
  let bestRank: number | null = null;

  for (const bnetChar of bnetChars) {
    const realmSlug = bnetChar.realm?.slug;
    if (!bnetChar.name || !realmSlug) continue;

    // Find matching character in our guild roster
    const char = await prisma.character.findFirst({
      where: {
        guildId: guild.id,
        name: { equals: bnetChar.name, mode: "insensitive" },
        realm: { equals: realmSlug, mode: "insensitive" },
      },
    });

    if (char) {
      // Link this character to the real user
      await prisma.character.update({
        where: { id: char.id },
        data: { userId: session.user.id },
      });
      linked++;

      // Track the highest-ranked (lowest number) character for role assignment
      if (char.guildRank !== null && (bestRank === null || char.guildRank < bestRank)) {
        bestRank = char.guildRank;
      }
    }
  }

  // Update GuildMembership role based on best guild rank found
  if (bestRank !== null) {
    const guildRole = bestRank === 0 ? "GM" : bestRank === 1 ? "OFFICER" : "MEMBER";
    await prisma.guildMembership.update({
      where: { id: membership.id },
      data: { role: guildRole },
    });
    return NextResponse.json({ linked, role: guildRole });
  }

  return NextResponse.json({ linked, role: membership.role });
}
