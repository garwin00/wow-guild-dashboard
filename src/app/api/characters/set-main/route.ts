import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { characterId } = await req.json();
  if (!characterId) return NextResponse.json({ error: "characterId required" }, { status: 400 });

  // Verify the character belongs to this user
  const char = await prisma.character.findFirst({
    where: { id: characterId, userId: session.user.id },
  });
  if (!char) return NextResponse.json({ error: "Character not found" }, { status: 404 });

  // Clear isMain for all user's characters, then set for this one
  await prisma.$transaction([
    prisma.character.updateMany({
      where: { userId: session.user.id },
      data: { isMain: false },
    }),
    prisma.character.update({
      where: { id: characterId },
      data: { isMain: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
