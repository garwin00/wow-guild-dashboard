import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/absences?guildSlug=X  — returns all active+upcoming absences for the guild (officers) or own absences (members)
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

  const isOfficer = ["GM", "OFFICER"].includes(membership.role);
  const absences = await prisma.absenceNotice.findMany({
    where: {
      guildId: membership.guild.id,
      ...(isOfficer ? {} : { userId: session.user.id }),
      endDate: { gte: new Date() },
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(absences);
}

// POST /api/absences
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { guildSlug, startDate, endDate, reason } = await req.json();

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug } },
    include: { guild: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const absence = await prisma.absenceNotice.create({
    data: {
      guildId: membership.guild.id,
      userId: session.user.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason ?? null,
    },
    include: { user: { select: { name: true, email: true } } },
  });
  return NextResponse.json(absence);
}

// DELETE /api/absences?id=X
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const absence = await prisma.absenceNotice.findUnique({ where: { id } });
  if (!absence) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Members can delete their own; officers can delete any in their guild
  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guildId: absence.guildId },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const isOfficer = ["GM", "OFFICER"].includes(membership.role);
  if (!isOfficer && absence.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.absenceNotice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
