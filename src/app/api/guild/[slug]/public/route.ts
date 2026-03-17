import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGuildProgression } from "@/lib/raiderio";

// GET /api/guild/[slug]/public — no auth required
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const guild = await prisma.guild.findUnique({
    where: { slug },
    select: {
      id: true, name: true, realm: true, region: true,
      imageUrl: true, isPublic: true, recruitMessage: true,
      characters: {
        select: { role: true, itemLevel: true, class: true },
      },
    },
  });

  if (!guild || !guild.isPublic) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Role counts
  const roleCounts = { TANK: 0, HEALER: 0, DPS: 0, UNKNOWN: 0 };
  let ilvlSum = 0, ilvlCount = 0;
  for (const c of guild.characters) {
    const r = (c.role ?? "UNKNOWN") as keyof typeof roleCounts;
    roleCounts[r] = (roleCounts[r] ?? 0) + 1;
    if (c.itemLevel) { ilvlSum += c.itemLevel; ilvlCount++; }
  }

  const progression = await getGuildProgression(guild.region, guild.realm, guild.name);

  return NextResponse.json({
    name: guild.name,
    realm: guild.realm,
    region: guild.region,
    imageUrl: guild.imageUrl,
    recruitMessage: guild.recruitMessage,
    rosterSize: guild.characters.length,
    avgItemLevel: ilvlCount ? Math.round(ilvlSum / ilvlCount) : null,
    roleCounts: { tank: roleCounts.TANK, healer: roleCounts.HEALER, dps: roleCounts.DPS },
    progression,
  });
}
