import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";

// PATCH /api/roster/trial — set or clear trial dates on a membership
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { membershipId, guildSlug, trialStartDate, trialReviewDate, clearTrial } = await req.json();
  if (!membershipId || !guildSlug) return NextResponse.json({ error: "membershipId and guildSlug required" }, { status: 400 });

  const membership = await getGuildMembership(session.user.id, guildSlug);
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });
  if (!["GM", "OFFICER"].includes(membership.role))
    return NextResponse.json({ error: "Officers only" }, { status: 403 });

  const updated = await prisma.guildMembership.update({
    where: { id: membershipId },
    data: {
      trialStartDate: clearTrial ? null : trialStartDate ? new Date(trialStartDate) : undefined,
      trialReviewDate: clearTrial ? null : trialReviewDate ? new Date(trialReviewDate) : undefined,
    },
  });

  return NextResponse.json(updated);
}
