import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_THEMES = ["default", "horde", "alliance"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const body = await req.json();

  // Must be GM or Officer
  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug } },
    select: { role: true, guild: { select: { id: true } } },
  });
  if (!membership || !["GM", "OFFICER"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const updates: Record<string, string> = {};
  if ("imageUrl" in body) updates.imageUrl = body.imageUrl ?? null;
  if ("bannerUrl" in body) updates.bannerUrl = body.bannerUrl ?? null;
  if ("wclGuildId" in body) updates.wclGuildId = body.wclGuildId ?? null;
  if (body.theme && VALID_THEMES.includes(body.theme)) updates.theme = body.theme;

  const guild = await prisma.guild.update({
    where: { id: membership.guild.id },
    data: updates,
  });

  return NextResponse.json({ ok: true, guild });
}
