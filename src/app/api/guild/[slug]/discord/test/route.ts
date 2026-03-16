import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";
import { sendDiscordWebhook } from "@/lib/discord";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["GM", "OFFICER"].includes(membership.role))
    return NextResponse.json({ error: "Officers only" }, { status: 403 });

  const webhook = membership.guild.discordWebhook;
  if (!webhook) return NextResponse.json({ error: "No webhook URL configured" }, { status: 400 });

  const embed = {
    title: "⚔️ ZugZug — Webhook Test",
    description: `Your Discord integration is working correctly for **${membership.guild.name}**.\n\nZug zug!`,
    color: 0xf0c040,
    timestamp: new Date().toISOString(),
    footer: { text: "ZugZug Guild Dashboard" },
  };

  await sendDiscordWebhook(webhook, embed);

  await prisma.discordWebhookLog.create({
    data: {
      guildId: membership.guild.id,
      event: "TEST",
      payload: JSON.stringify(embed),
      success: true,
    },
  });

  return NextResponse.json({ ok: true });
}
