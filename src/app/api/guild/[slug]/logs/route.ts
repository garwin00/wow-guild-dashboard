import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const [reports, guild] = await Promise.all([
    prisma.logReport.findMany({
      where: { guildId: membership.guild.id },
      include: { _count: { select: { parses: true } } },
      orderBy: { startTime: "desc" },
    }),
    prisma.guild.findUnique({ where: { id: membership.guild.id } }),
  ]);

  return NextResponse.json({ reports, guild });
}
