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

  const { status, reviewNote } = await req.json();
  const validStatuses = ["PENDING", "REVIEWING", "ACCEPTED", "DECLINED"];
  if (status && !validStatuses.includes(status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const application = await prisma.guildApplication.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(reviewNote !== undefined ? { reviewNote } : {}),
      reviewedById: session.user.id,
    },
  });

  return NextResponse.json(application);
}
