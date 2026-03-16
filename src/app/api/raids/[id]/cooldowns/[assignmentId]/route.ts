import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/queries";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id, assignmentId } = await params;
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignment = await prisma.cooldownAssignment.findUnique({
    where: { id: assignmentId },
    include: { raidEvent: { include: { guild: { include: { memberships: { where: { userId: session.user.id } } } } } } },
  });

  if (!assignment || assignment.raidEventId !== id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = assignment.raidEvent.guild.memberships[0];
  if (!membership || !["GM", "OFFICER"].includes(membership.role))
    return NextResponse.json({ error: "Officers only" }, { status: 403 });

  await prisma.cooldownAssignment.delete({ where: { id: assignmentId } });
  return NextResponse.json({ ok: true });
}
