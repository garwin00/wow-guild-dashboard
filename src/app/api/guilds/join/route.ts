import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/guilds/join  { guildId }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { guildId } = await req.json();
  if (!guildId) return NextResponse.json({ error: "Missing guildId" }, { status: 400 });

  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) return NextResponse.json({ error: "Guild not found" }, { status: 404 });

  // Check if already a member
  const existing = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guildId },
  });
  if (existing) {
    return NextResponse.json({ slug: guild.slug, alreadyMember: true });
  }

  await prisma.guildMembership.create({
    data: { userId: session.user.id, guildId, role: "MEMBER" },
  });

  return NextResponse.json({ slug: guild.slug });
}
