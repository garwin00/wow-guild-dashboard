import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGuildRoster, getCharacterProfile } from "@/lib/blizzard";

// Map active spec name → CharacterRole
const TANK_SPECS = new Set(["Blood", "Vengeance", "Guardian", "Brewmaster", "Protection"]);
const HEALER_SPECS = new Set(["Holy", "Discipline", "Restoration", "Mistweaver", "Preservation"]);

function specToRole(spec: string | null): "TANK" | "HEALER" | "DPS" {
  if (!spec) return "DPS";
  if (TANK_SPECS.has(spec)) return "TANK";
  if (HEALER_SPECS.has(spec)) return "HEALER";
  return "DPS";
}

// Fetch in chunks to avoid rate limits
async function chunked<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const settled = await Promise.allSettled(chunk.map(fn));
    for (const r of settled) {
      if (r.status === "fulfilled") results.push(r.value);
    }
  }
  return results;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { guildSlug } = await req.json();

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug }, role: { in: ["GM", "OFFICER"] } },
    include: { guild: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { guild } = membership;
  const data = await getGuildRoster(guild.region, guild.realm, guild.name);

  const placeholder = await prisma.user.upsert({
    where: { bnetId: "ROSTER_SYNC_PLACEHOLDER" },
    update: {},
    create: { bnetId: "ROSTER_SYNC_PLACEHOLDER", battletag: "Unknown", name: "Unknown" },
  });

  // Filter to level 70+ members only (max level chars)
  const members = (data?.members ?? []).filter(
    (m: { character?: { level?: number } }) => (m?.character?.level ?? 0) >= 70
  );

  let synced = 0;

  await chunked(members, 10, async (member: { rank?: number; character?: { name?: string; realm?: { slug?: string }; playable_class?: { name?: string }; level?: number } }) => {
    const char = member?.character;
    if (!char?.name) return;

    const realmSlug = char.realm?.slug ?? guild.realm;
    const className = char.playable_class?.name ?? "Unknown";
    const guildRank: number | null = member?.rank ?? null;

    // Fetch individual profile for spec + item level
    let spec: string | null = null;
    let itemLevel: number | null = null;
    try {
      const profile = await getCharacterProfile(guild.region, realmSlug, char.name);
      spec = profile?.active_spec?.name ?? null;
      itemLevel = profile?.equipped_item_level ?? profile?.average_item_level ?? null;
    } catch {
      // Profile fetch failed — keep defaults
    }

    const role = specToRole(spec);

    await prisma.character.upsert({
      where: { name_realm_region: { name: char.name, realm: realmSlug, region: guild.region } },
      update: {
        class: className,
        spec,
        role,
        itemLevel,
        guildRank,
        guildId: guild.id,
      },
      create: {
        name: char.name,
        realm: realmSlug,
        region: guild.region,
        class: className,
        spec,
        role,
        itemLevel,
        guildRank,
        guildId: guild.id,
        userId: placeholder.id,
      },
    });
    synced++;
  });

  return NextResponse.json({ synced });
}
