import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!caller?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, isAdmin } = await req.json();
  if (!userId || typeof isAdmin !== "boolean") {
    return NextResponse.json({ error: "userId and isAdmin required" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data: { isAdmin } });
  return NextResponse.json({ ok: true });
}
