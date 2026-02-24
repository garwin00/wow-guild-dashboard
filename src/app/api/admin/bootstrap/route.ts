import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * One-time bootstrap: promotes the calling user to admin if no admins exist yet.
 * Safe to leave in — does nothing once any admin exists.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "You must be logged in" }, { status: 401 });

  const existingAdmin = await prisma.user.findFirst({ where: { isAdmin: true } });
  if (existingAdmin) {
    return NextResponse.json({ error: "An admin already exists. Use /admin to manage admins." }, { status: 403 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { isAdmin: true },
    select: { email: true, battletag: true },
  });

  return NextResponse.json({ ok: true, promoted: user.email ?? user.battletag });
}
