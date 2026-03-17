import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/guild/[slug]/apply — no auth required
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const guild = await prisma.guild.findUnique({ where: { slug }, select: { id: true, isPublic: true } });
  if (!guild || !guild.isPublic) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { characterName, realm, class: cls, role, message, discordTag } = await req.json();
  if (!characterName || !realm || !cls || !role)
    return NextResponse.json({ error: "characterName, realm, class and role are required" }, { status: 400 });

  const validRoles = ["TANK", "HEALER", "DPS"];
  if (!validRoles.includes(role))
    return NextResponse.json({ error: "role must be TANK, HEALER, or DPS" }, { status: 400 });

  const application = await prisma.guildApplication.create({
    data: {
      guildId: guild.id,
      characterName, realm,
      class: cls, role,
      message: message || null,
      discordTag: discordTag || null,
    },
  });

  return NextResponse.json({ ok: true, id: application.id }, { status: 201 });
}
