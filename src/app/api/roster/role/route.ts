import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { characterId, role, guildSlug } = await req.json();
  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug }, role: { in: ["GM", "OFFICER"] } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const character = await prisma.character.update({ where: { id: characterId }, data: { role } });
  return NextResponse.json(character);
}
