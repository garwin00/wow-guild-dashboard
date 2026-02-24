import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = await prisma.raidEvent.findUnique({
    where: { id },
    include: { guild: { include: { memberships: { where: { userId: session.user.id } } } } },
  });
  if (!event || event.guild.memberships.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const signups = await prisma.signup.findMany({
    where: { raidEventId: id },
    include: { character: { select: { id: true, name: true, class: true, spec: true, role: true, itemLevel: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(signups);
}
