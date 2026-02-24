import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { membershipId, role, guildId } = await req.json();
  const caller = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guildId, role: "GM" },
  });
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const updated = await prisma.guildMembership.update({ where: { id: membershipId }, data: { role } });
  return NextResponse.json(updated);
}
