import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendDiscordWebhook, raidCreatedEmbed, parseWebhookEvents } from "@/lib/discord";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { guildSlug, title, raidZone, scheduledAt, maxAttendees, minItemLevel, description } = await req.json();
  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug }, role: { in: ["GM", "OFFICER"] } },
    include: { guild: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const event = await prisma.raidEvent.create({
    data: { guildId: membership.guild.id, title, raidZone, scheduledAt: new Date(scheduledAt), maxAttendees: maxAttendees ?? 25, minItemLevel: minItemLevel ?? null, description },
  });

  // Fire Discord webhook if configured
  const { guild } = membership;
  if (guild.discordWebhook) {
    const events = parseWebhookEvents(guild.discordWebhookEvents);
    if (events.raidCreated !== false) {
      const embed = raidCreatedEmbed(title, raidZone, new Date(scheduledAt), guildSlug);
      sendDiscordWebhook(guild.discordWebhook, embed)
        .then((result) =>
          prisma.discordWebhookLog.create({
            data: { guildId: guild.id, event: "RAID_CREATED", payload: JSON.stringify(embed), success: result.ok },
          })
        )
        .catch(console.warn);
    }
  }

  return NextResponse.json(event);
}
