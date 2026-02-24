import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGuildRoster } from "@/lib/blizzard";

// POST /api/guilds/create  { name, realm, realmSlug, region }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, realm, realmSlug, region } = await req.json();
  if (!name || !realmSlug) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const slug = `${name}-${realmSlug}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");

  // Check if guild already exists
  let guild = await prisma.guild.findUnique({ where: { slug } });

  if (!guild) {
    guild = await prisma.guild.create({
      data: { name, realm, region: region ?? "eu", slug },
    });
  }

  // Make the current user GM (or member if guild already existed)
  const existingMembership = await prisma.guildMembership.findUnique({
    where: { userId_guildId: { userId: session.user.id, guildId: guild.id } },
  });

  if (!existingMembership) {
    const isFirstMember = (await prisma.guildMembership.count({ where: { guildId: guild.id } })) === 0;
    await prisma.guildMembership.create({
      data: {
        userId: session.user.id,
        guildId: guild.id,
        role: isFirstMember ? "GM" : "MEMBER",
      },
    });
  }

  // Sync roster from Blizzard API in the background
  syncRoster(guild.id, region ?? "eu", realmSlug, name).catch(console.error);

  return NextResponse.json({ slug: guild.slug });
}

async function syncRoster(guildId: string, region: string, realmSlug: string, guildName: string) {
  try {
    const data = await getGuildRoster(region, realmSlug, guildName);
    const members = data?.members ?? [];

    for (const member of members) {
      const char = member?.character;
      if (!char) continue;

      const name: string = char.name;
      const realm: string = char.realm?.slug ?? realmSlug;
      const charClass: string = char.playable_class?.name ?? "Unknown";
      const level: number = char.level ?? 0;
      if (level < 10) continue; // skip very low level alts

      // Upsert character without user link (they'll claim via login)
      await prisma.character.upsert({
        where: { name_realm_region: { name, realm, region } },
        update: { class: charClass, itemLevel: char.equipped_item_level ?? null, guildId },
        create: {
          name,
          realm,
          region,
          class: charClass,
          itemLevel: char.equipped_item_level ?? null,
          guildId,
          userId: await getOrCreatePlaceholderUserId(),
        },
      });
    }
  } catch (err) {
    console.error("Roster sync failed:", err);
  }
}

// Characters from roster sync don't have users yet — placeholder until they log in
let _placeholderUserId: string | null = null;
async function getOrCreatePlaceholderUserId(): Promise<string> {
  if (_placeholderUserId) return _placeholderUserId;
  const existing = await prisma.user.findFirst({ where: { bnetId: "ROSTER_SYNC_PLACEHOLDER" } });
  if (existing) { _placeholderUserId = existing.id; return existing.id; }
  const created = await prisma.user.create({
    data: { bnetId: "ROSTER_SYNC_PLACEHOLDER", battletag: "Unknown", name: "Unknown" },
  });
  _placeholderUserId = created.id;
  return created.id;
}
