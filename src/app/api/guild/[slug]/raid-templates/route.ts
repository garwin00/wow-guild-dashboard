import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const templates = await prisma.recurringRaidTemplate.findMany({
    where: { guildId: membership.guild.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });
  if (!["GM", "OFFICER"].includes(membership.role))
    return NextResponse.json({ error: "Officers only" }, { status: 403 });

  const { title, raidZone, dayOfWeek, startTime, maxAttendees, minItemLevel, description } = await req.json();
  if (!title || !raidZone || dayOfWeek === undefined || !startTime)
    return NextResponse.json({ error: "title, raidZone, dayOfWeek, and startTime are required" }, { status: 400 });

  const template = await prisma.recurringRaidTemplate.create({
    data: {
      guildId: membership.guild.id,
      title, raidZone,
      dayOfWeek: Number(dayOfWeek),
      startTime,
      maxAttendees: Number(maxAttendees ?? 25),
      minItemLevel: minItemLevel ? Number(minItemLevel) : null,
      description: description || null,
    },
  });
  return NextResponse.json(template, { status: 201 });
}
