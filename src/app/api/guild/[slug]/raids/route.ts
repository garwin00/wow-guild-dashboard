import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const [events, userCharacters] = await Promise.all([
    prisma.raidEvent.findMany({
      where: { guildId: membership.guild.id },
      include: { _count: { select: { signups: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.character.findMany({
      where: { userId: membership.userId, guildId: membership.guild.id },
    }),
  ]);

  return NextResponse.json({ events, userCharacters });
}
