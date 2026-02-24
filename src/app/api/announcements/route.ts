import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/announcements?guildSlug=X
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const guildSlug = searchParams.get("guildSlug");
  if (!guildSlug) return NextResponse.json({ error: "Missing guildSlug" }, { status: 400 });

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug } },
    include: { guild: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const announcements = await prisma.announcement.findMany({
    where: {
      guildId: membership.guild.id,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: { author: { select: { name: true, email: true } } },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 20,
  });
  return NextResponse.json(announcements);
}

// POST /api/announcements
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { guildSlug, title, body, pinned, expiresAt } = await req.json();

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug }, role: { in: ["GM", "OFFICER"] } },
    include: { guild: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const announcement = await prisma.announcement.create({
    data: {
      guildId: membership.guild.id,
      authorId: session.user.id,
      title,
      body,
      pinned: pinned ?? false,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    include: { author: { select: { name: true, email: true } } },
  });
  return NextResponse.json(announcement);
}

// PATCH /api/announcements?id=X  (pin/unpin toggle)
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { pinned } = await req.json();

  const ann = await prisma.announcement.findUnique({ where: { id } });
  if (!ann) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guildId: ann.guildId, role: { in: ["GM", "OFFICER"] } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.announcement.update({ where: { id }, data: { pinned } });
  return NextResponse.json(updated);
}

// DELETE /api/announcements?id=X
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const ann = await prisma.announcement.findUnique({ where: { id } });
  if (!ann) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guildId: ann.guildId, role: { in: ["GM", "OFFICER"] } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.announcement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
