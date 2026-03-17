import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership || !["GM", "OFFICER"].includes(membership.role))
    return NextResponse.json({ error: "Officers only" }, { status: 403 });

  const body = await req.json();
  const allowed = ["title", "raidZone", "dayOfWeek", "startTime", "maxAttendees", "minItemLevel", "description", "isActive"] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key] === "" ? null : body[key];
  }

  const template = await prisma.recurringRaidTemplate.update({ where: { id }, data });
  return NextResponse.json(template);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership || !["GM", "OFFICER"].includes(membership.role))
    return NextResponse.json({ error: "Officers only" }, { status: 403 });

  await prisma.recurringRaidTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
