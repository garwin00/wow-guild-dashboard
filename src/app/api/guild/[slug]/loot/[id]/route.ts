import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });
  if (!["GM", "OFFICER"].includes(membership.role))
    return NextResponse.json({ error: "Officers only" }, { status: 403 });

  const record = await prisma.lootRecord.findUnique({ where: { id } });
  if (!record || record.guildId !== membership.guild.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.lootRecord.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
