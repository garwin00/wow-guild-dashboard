import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendDiscordWebhook, signupChangedEmbed, parseWebhookEvents } from "@/lib/discord";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { raidEventId, characterId, status, note } = await req.json();
  const character = await prisma.character.findFirst({ where: { id: characterId, userId: session.user.id } });
  if (!character) return NextResponse.json({ error: "Character not yours" }, { status: 403 });
  const signup = await prisma.signup.upsert({
    where: { raidEventId_characterId: { raidEventId, characterId } },
    update: { status, note },
    create: { raidEventId, characterId, status, note },
  });

  // Fire Discord webhook (non-blocking)
  prisma.raidEvent.findUnique({
    where: { id: raidEventId },
    include: { guild: true },
  }).then(async (event) => {
    if (!event?.guild.discordWebhook) return;
    const events = parseWebhookEvents(event.guild.discordWebhookEvents ?? null);
    if (!events.signupChanged) return;
    const embed = signupChangedEmbed(character.name, status, event.title, event.guild.slug);
    await sendDiscordWebhook(event.guild.discordWebhook, embed).catch(() => {});
  }).catch(() => {});

  return NextResponse.json(signup);
}

// Officers can update any signup status
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { signupId, status, guildSlug } = await req.json();
  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug }, role: { in: ["GM", "OFFICER"] } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const signup = await prisma.signup.update({ where: { id: signupId }, data: { status } });
  return NextResponse.json(signup);
}
