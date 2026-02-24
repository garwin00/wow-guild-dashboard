import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { guildSlug, title, raidZone, scheduledAt, maxAttendees, description } = await req.json();
  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug }, role: { in: ["GM", "OFFICER"] } },
    include: { guild: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const event = await prisma.raidEvent.create({
    data: { guildId: membership.guild.id, title, raidZone, scheduledAt: new Date(scheduledAt), maxAttendees: maxAttendees ?? 25, description },
  });
  return NextResponse.json(event);
}
