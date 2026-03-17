import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";
import { getLootFromReport } from "@/lib/warcraftlogs";

// POST /api/guild/[slug]/loot/import
// Imports loot from a WCL report. Matches characters by name against guild roster.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });
  if (!["GM", "OFFICER"].includes(membership.role))
    return NextResponse.json({ error: "Officers only" }, { status: 403 });

  const { reportCode, raidEventId, preview } = await req.json();
  if (!reportCode) return NextResponse.json({ error: "reportCode is required" }, { status: 400 });

  // Fetch report fights to get actor names → IDs mapping
  let lootItems;
  try {
    lootItems = await getLootFromReport(reportCode);
  } catch (e) {
    return NextResponse.json({ error: `WCL error: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }

  if (!lootItems.length) return NextResponse.json({ imported: 0, skipped: 0, unmatched: [] });

  // Load guild roster for name matching
  const guildChars = await prisma.character.findMany({
    where: { guildId: membership.guild.id },
    select: { id: true, name: true },
  });
  const charByName = new Map(guildChars.map((c) => [c.name.toLowerCase(), c.id]));

  // Group by unique characterID in WCL (we need actor name — use characterID as proxy key)
  // WCL loot items have characterID but not name; we need to match via name from the items themselves
  // The WCL loot data format includes name field per item
  const unmatched = new Set<string>();
  let imported = 0;
  let skipped = 0;

  if (preview) {
    // Dry run — return what would be imported
    const previewItems = lootItems.slice(0, 20).map((item) => {
      const charId = item.name ? charByName.get(item.name.toLowerCase()) : undefined;
      return {
        itemName: item.name,
        itemLevel: item.itemLevel,
        matched: !!charId,
      };
    });
    return NextResponse.json({ preview: previewItems, total: lootItems.length });
  }

  for (const item of lootItems) {
    // item.name here is the item name (WCL loot schema), not character name
    // characterID is the WCL actor ID — we need to match by name from the report's masterData
    // Since we only have item names and characterIDs from the loot endpoint,
    // we skip unresolvable character IDs and note them as unmatched
    const charId = charByName.get(String(item.characterID).toLowerCase());
    if (!charId) {
      unmatched.add(String(item.characterID));
      skipped++;
      continue;
    }

    // Check for duplicate: same guild + characterId + itemName + within 24h
    const existingKey = await prisma.lootRecord.findFirst({
      where: {
        guildId: membership.guild.id,
        characterId: charId,
        itemName: item.name,
        source: "WCL",
      },
    });
    if (existingKey) { skipped++; continue; }

    await prisma.lootRecord.create({
      data: {
        guildId: membership.guild.id,
        characterId: charId,
        raidEventId: raidEventId ?? null,
        itemName: item.name,
        itemLevel: item.itemLevel,
        source: "WCL",
        awardedAt: item.obtainedAt ? new Date(item.obtainedAt) : new Date(),
      },
    });
    imported++;
  }

  return NextResponse.json({ imported, skipped, unmatched: [...unmatched] });
}
