import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGuildRoster } from "@/lib/blizzard";

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
  let synced = 0;
  for (const member of data?.members ?? []) {
    const char = member?.character;
    if (!char || (char.level ?? 0) < 10) continue;
    await prisma.character.upsert({
      where: { name_realm_region: { name: char.name, realm: char.realm?.slug ?? guild.realm, region: guild.region } },
      update: { class: char.playable_class?.name ?? "Unknown", guildId: guild.id },
      create: { name: char.name, realm: char.realm?.slug ?? guild.realm, region: guild.region, class: char.playable_class?.name ?? "Unknown", guildId: guild.id, userId: placeholder.id },
    });
    synced++;
  }
  return NextResponse.json({ synced });
}
