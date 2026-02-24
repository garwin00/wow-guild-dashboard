import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CharacterRole } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const char = await prisma.character.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!char) return NextResponse.json({ error: "Character not found" }, { status: 404 });

  const updates: { role?: CharacterRole; spec?: string } = {};
  if (body.role && Object.values(CharacterRole).includes(body.role)) {
    updates.role = body.role as CharacterRole;
  }
  if ("spec" in body) updates.spec = body.spec ?? null;

  const updated = await prisma.character.update({ where: { id }, data: updates });
  return NextResponse.json({ ok: true, character: updated });
}
