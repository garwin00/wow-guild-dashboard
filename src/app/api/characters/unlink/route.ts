import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { characterId } = await req.json();
  if (!characterId) return NextResponse.json({ error: "characterId required" }, { status: 400 });

  const char = await prisma.character.findFirst({
    where: { id: characterId, userId: session.user.id },
  });
  if (!char) return NextResponse.json({ error: "Character not found" }, { status: 404 });

  await prisma.character.update({
    where: { id: characterId },
    data: { userId: null as unknown as string, isMain: false },
  });

  return NextResponse.json({ ok: true });
}
