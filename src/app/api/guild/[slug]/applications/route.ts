import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership || !["GM", "OFFICER"].includes(membership.role))
    return NextResponse.json({ error: "Officers only" }, { status: 403 });

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
  const pageSize = 20;

  const where = {
    guildId: membership.guild.id,
    ...(status ? { status } : {}),
  };

  const [applications, total] = await Promise.all([
    prisma.guildApplication.findMany({
      where,
      include: { reviewedBy: { select: { name: true, battletag: true } } },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.guildApplication.count({ where }),
  ]);

  return NextResponse.json({ applications, total, page, pageSize });
}
