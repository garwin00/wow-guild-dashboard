import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ authenticated: false, linked: false });
  }

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "battlenet" },
    select: { id: true, access_token: true },
  });

  return NextResponse.json({
    authenticated: true,
    userId: session.user.id,
    linked: !!account,
    hasToken: !!account?.access_token,
  });
}
