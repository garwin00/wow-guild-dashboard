import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { guildId, wclGuildId } = await req.json();
  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guildId, role: { in: ["GM", "OFFICER"] } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.guild.update({ where: { id: guildId }, data: { wclGuildId: wclGuildId || null } });
  return NextResponse.json({ ok: true });
}
