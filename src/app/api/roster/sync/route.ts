import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGuildRoster, getCharacterProfile } from "@/lib/blizzard";
import { fetchCharacterAvatar } from "@/lib/raiderio";

// Map active spec name → CharacterRole
const TANK_SPECS = new Set(["Blood", "Vengeance", "Guardian", "Brewmaster", "Protection"]);
const HEALER_SPECS = new Set(["Holy", "Discipline", "Restoration", "Mistweaver", "Preservation"]);

// Blizzard guild roster only returns class ID, not name — map it here
const CLASS_ID_MAP: Record<number, string> = {
  1: "Warrior", 2: "Paladin", 3: "Hunter", 4: "Rogue", 5: "Priest",
  6: "Death Knight", 7: "Shaman", 8: "Mage", 9: "Warlock", 10: "Monk",
  11: "Druid", 12: "Demon Hunter", 13: "Evoker",
};

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
    where: { userId: session.user.id, guild: { slug: guildSlug } },
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
    // Class ID from roster (name not included in roster response)
    const classIdFallback = CLASS_ID_MAP[(char as { playable_class?: { id?: number } }).playable_class?.id ?? 0] ?? null;
    const guildRank: number | null = member?.rank ?? null;

    // Fetch individual profile (Blizzard) + avatar/class/spec (Raider.IO) in parallel
    let className: string | null = null;
    let spec: string | null = null;
    let itemLevel: number | null = null;
    let avatarUrl: string | null = null;
    try {
      const [profile, rio] = await Promise.all([
        getCharacterProfile(guild.region, realmSlug, char.name),
        fetchCharacterAvatar(guild.region, realmSlug, char.name),
      ]);
      // Blizzard profile is authoritative for class/spec/ilvl
      className = profile?.character_class?.name ?? profile?.playable_class?.name ?? rio.className ?? classIdFallback;
      spec = profile?.active_spec?.name ?? rio.spec ?? null;
      itemLevel = profile?.equipped_item_level ?? profile?.average_item_level ?? null;
      avatarUrl = rio.avatarUrl;
      console.log(`[roster sync] ${char.name}: class=${className}, spec=${spec}, ilvl=${itemLevel}, avatar=${!!avatarUrl}`);
    } catch (err) {
      console.warn(`[roster sync] profile fetch failed for ${char.name}:`, err);
      // Still try Raider.IO alone as fallback
      try {
        const rio = await fetchCharacterAvatar(guild.region, realmSlug, char.name);
        className = rio.className ?? classIdFallback;
        spec = rio.spec;
        avatarUrl = rio.avatarUrl;
      } catch {
        className = classIdFallback;
      }
    }

    const role = specToRole(spec);

    // Map Blizzard guild rank to GuildRole: 0=GM, 1=Officer, 2+=Member
    const guildRole = guildRank === 0 ? "GM" : guildRank === 1 ? "OFFICER" : "MEMBER";

    const upserted = await prisma.character.upsert({
      where: { name_realm_region: { name: char.name, realm: realmSlug, region: guild.region } },
      update: {
        ...(className ? { class: className } : {}),
        spec,
        role,
        itemLevel,
        guildRank,
        guildId: guild.id,
        ...(avatarUrl ? { avatarUrl } : {}),
      },
      create: {
        name: char.name,
        realm: realmSlug,
        region: guild.region,
        class: className ?? "Unknown",
        spec,
        role,
        itemLevel,
        guildRank,
        guildId: guild.id,
        avatarUrl,
        userId: placeholder.id,
      },
    });

    // Update GuildMembership role for users who own this character
    if (upserted.userId && upserted.userId !== placeholder.id) {
      await prisma.guildMembership.updateMany({
        where: { userId: upserted.userId, guildId: guild.id },
        data: { role: guildRole as "GM" | "OFFICER" | "MEMBER" },
      });
    }
    synced++;
  });

  return NextResponse.json({ synced });
}
