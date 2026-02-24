import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveReport, getLiveFights } from "@/lib/warcraftlogs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const guildSlug = searchParams.get("guildSlug");

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug! } },
    include: { guild: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { guild } = membership;
  if (!guild.wclGuildId) return NextResponse.json({ active: null, fights: null });

  // wclGuildId stores the guild name for WCL lookups
  const realmSlug = guild.realm.toLowerCase().replace(/\s+/g, "-");
  const active = await getActiveReport(guild.wclGuildId, realmSlug, guild.region);
  if (!active) return NextResponse.json({ active: null, fights: null });

  const fights = await getLiveFights(active.code);
  return NextResponse.json({ active, fights });
}
