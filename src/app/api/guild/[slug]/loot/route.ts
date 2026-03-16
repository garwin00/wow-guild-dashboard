import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const raidEventId = req.nextUrl.searchParams.get("raidEventId") ?? undefined;
  const characterId = req.nextUrl.searchParams.get("characterId") ?? undefined;
  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, parseInt(req.nextUrl.searchParams.get("pageSize") ?? "50", 10));

  const where = {
    guildId: membership.guild.id,
    ...(raidEventId ? { raidEventId } : {}),
    ...(characterId ? { characterId } : {}),
    ...(search ? {
      OR: [
        { itemName: { contains: search, mode: "insensitive" as const } },
        { character: { name: { contains: search, mode: "insensitive" as const } } },
      ],
    } : {}),
  };

  const [records, total] = await Promise.all([
    prisma.lootRecord.findMany({
      where,
      include: {
        character: { select: { id: true, name: true, class: true, avatarUrl: true } },
        raidEvent: { select: { id: true, title: true } },
      },
      orderBy: { awardedAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.lootRecord.count({ where }),
  ]);

  return NextResponse.json({ records, total, page, pageSize });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });
  if (!["GM", "OFFICER"].includes(membership.role))
    return NextResponse.json({ error: "Officers only" }, { status: 403 });

  const { characterId, characterName, itemName, itemLevel, bossName, raidEventId } = await req.json();

  // Accept either characterId or characterName
  let resolvedCharacterId = characterId;
  if (!resolvedCharacterId && characterName) {
    const char = await prisma.character.findFirst({
      where: { guildId: membership.guild.id, name: { equals: characterName, mode: "insensitive" } },
    });
    if (!char) return NextResponse.json({ error: `Character "${characterName}" not found in guild roster` }, { status: 404 });
    resolvedCharacterId = char.id;
  }

  if (!resolvedCharacterId || !itemName || !itemLevel)
    return NextResponse.json({ error: "characterId (or characterName), itemName and itemLevel are required" }, { status: 400 });

  const record = await prisma.lootRecord.create({
    data: {
      guildId: membership.guild.id,
      characterId: resolvedCharacterId,
      itemName,
      itemLevel: parseInt(itemLevel, 10),
      bossName: bossName ?? null,
      raidEventId: raidEventId ?? null,
      source: "MANUAL",
    },
    include: {
      character: { select: { id: true, name: true, class: true } },
    },
  });

  return NextResponse.json(record, { status: 201 });
}
