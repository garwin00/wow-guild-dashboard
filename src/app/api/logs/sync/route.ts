import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGuildReports } from "@/lib/warcraftlogs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const guildSlug = searchParams.get("guildSlug");
  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug! }, role: { in: ["GM", "OFFICER"] } },
    include: { guild: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const guild = membership.guild;
  if (!guild.wclGuildId) return NextResponse.json({ error: "No WCL guild linked" }, { status: 400 });

  // wclGuildId is stored as "GuildName/serverSlug/region" or just guild name — use guild data
  const reports = await getGuildReports(guild.wclGuildId, guild.realm.toLowerCase().replace(/\s+/g, "-"), guild.region);
  const data = (reports as Array<{ code: string; title: string; zone?: { name: string }; startTime: number; fights?: unknown[] }>);
  let count = 0;
  for (const r of data) {
    await prisma.logReport.upsert({
      where: { wclCode: r.code },
      create: { guildId: guild.id, wclCode: r.code, title: r.title, zone: r.zone?.name ?? null, startTime: new Date(r.startTime), fightCount: r.fights?.length ?? 0 },
      update: { fightCount: r.fights?.length ?? 0 },
    });
    count++;
  }
  return NextResponse.json({ count });
}
