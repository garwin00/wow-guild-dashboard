import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/queries";

async function getOfficerMembership(userId: string, raidId: string) {
  const event = await prisma.raidEvent.findUnique({
    where: { id: raidId },
    include: { guild: { include: { memberships: { where: { userId } } } } },
  });
  if (!event) return { event: null, membership: null };
  const membership = event.guild.memberships[0] ?? null;
  return { event, membership };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { event, membership } = await getOfficerMembership(session.user.id, id);
  if (!event || !membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const export_ = req.nextUrl.searchParams.get("export");

  const assignments = await prisma.cooldownAssignment.findMany({
    where: { raidEventId: id },
    include: { character: { select: { name: true, class: true } } },
    orderBy: [{ bossName: "asc" }, { pullNumber: "asc" }, { createdAt: "asc" }],
  });

  if (export_ === "text") {
    // Group by boss → pull for Discord export
    const grouped = new Map<string, typeof assignments>();
    for (const a of assignments) {
      const key = `${a.bossName} (Pull ${a.pullNumber})`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(a);
    }

    const lines: string[] = [`**${event.title} — Cooldown Sheet**`, ""];
    for (const [boss, rows] of grouped) {
      lines.push(`**${boss}**`);
      for (const r of rows) {
        lines.push(`• ${r.character.name} — ${r.cooldownName}${r.targetNote ? ` _(${r.targetNote})_` : ""}`);
      }
      lines.push("");
    }

    return new NextResponse(lines.join("\n"), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return NextResponse.json({ assignments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { event, membership } = await getOfficerMembership(session.user.id, id);
  if (!event || !membership) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["GM", "OFFICER"].includes(membership.role))
    return NextResponse.json({ error: "Officers only" }, { status: 403 });

  const { bossName, pullNumber, characterId, cooldownName, targetNote } = await req.json();
  if (!bossName || !characterId || !cooldownName)
    return NextResponse.json({ error: "bossName, characterId and cooldownName are required" }, { status: 400 });

  const assignment = await prisma.cooldownAssignment.create({
    data: {
      raidEventId: id,
      bossName,
      pullNumber: pullNumber ?? 1,
      characterId,
      cooldownName,
      targetNote: targetNote ?? null,
    },
    include: { character: { select: { name: true, class: true } } },
  });

  return NextResponse.json(assignment, { status: 201 });
}
