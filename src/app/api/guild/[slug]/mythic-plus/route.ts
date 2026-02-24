import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";
import { getCurrentAffixes } from "@/lib/raiderio";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const [characters, affixes] = await Promise.all([
    prisma.character.findMany({
      where: { guildId: membership.guild.id },
      include: { mythicScore: true, mythicRuns: { orderBy: { score: "desc" }, take: 10 } },
      orderBy: [{ name: "asc" }],
    }),
    getCurrentAffixes(membership.guild.region),
  ]);

  return NextResponse.json({ characters, affixes });
}
