import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/guilds/search?name=X&realm=Y&region=Z
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim();
  const realm = searchParams.get("realm")?.trim();
  const region = searchParams.get("region")?.trim();

  if (!name) return NextResponse.json({ guilds: [] });

  const guilds = await prisma.guild.findMany({
    where: {
      name: { contains: name, mode: "insensitive" },
      ...(realm ? { realm: { contains: realm, mode: "insensitive" } } : {}),
      ...(region ? { region: { equals: region, mode: "insensitive" } } : {}),
    },
    select: { id: true, name: true, realm: true, region: true, slug: true, imageUrl: true,
      _count: { select: { memberships: true } } },
    take: 10,
  });

  return NextResponse.json({ guilds });
}
