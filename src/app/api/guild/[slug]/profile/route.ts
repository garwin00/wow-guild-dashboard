import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const [user, characters] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, battletag: true, email: true, image: true, bnetId: true },
    }),
    prisma.character.findMany({
      where: { userId: session.user.id },
      include: {
        guild: { select: { name: true, slug: true } },
        mythicScore: { select: { all: true } },
      },
      orderBy: [{ isMain: "desc" }, { itemLevel: "desc" }],
    }),
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    user,
    memberRole: membership.role,
    characters: characters.map((c) => ({
      id: c.id,
      name: c.name,
      realm: c.realm,
      region: c.region,
      class: c.class,
      spec: c.spec,
      role: c.role,
      itemLevel: c.itemLevel,
      level: c.level,
      isMain: c.isMain,
      avatarUrl: c.avatarUrl,
      guildName: c.guild?.name ?? null,
      guildSlug: c.guild?.slug ?? null,
      mythicScore: c.mythicScore?.all ?? null,
    })),
  });
}
