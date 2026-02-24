import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/officer-notes?guildSlug=X&targetUserId=Y
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const guildSlug = searchParams.get("guildSlug");
  const targetUserId = searchParams.get("targetUserId");
  if (!guildSlug || !targetUserId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug }, role: { in: ["GM", "OFFICER"] } },
    include: { guild: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const notes = await prisma.officerNote.findMany({
    where: { guildId: membership.guild.id, targetUserId },
    include: { author: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notes);
}

// POST /api/officer-notes
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { guildSlug, targetUserId, content } = await req.json();

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug }, role: { in: ["GM", "OFFICER"] } },
    include: { guild: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const note = await prisma.officerNote.create({
    data: { guildId: membership.guild.id, targetUserId, authorId: session.user.id, content },
    include: { author: { select: { name: true, email: true } } },
  });
  return NextResponse.json(note);
}

// DELETE /api/officer-notes?id=X
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const note = await prisma.officerNote.findUnique({ where: { id } });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Only GM/Officer of the guild, and only if they're the author (or GM)
  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guildId: note.guildId, role: { in: ["GM", "OFFICER"] } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.officerNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
