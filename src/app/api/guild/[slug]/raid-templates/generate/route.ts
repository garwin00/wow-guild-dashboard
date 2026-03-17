import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getGuildMembership } from "@/lib/queries";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// POST /api/guild/[slug]/raid-templates/generate
// Generates RaidEvent rows for the next N weeks from all active templates.
// Skips weeks where an event from the same template already exists.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership || !["GM", "OFFICER"].includes(membership.role))
    return NextResponse.json({ error: "Officers only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const weeks = Math.min(Number(body.weeks ?? 4), 8);
  const templateId: string | undefined = body.templateId;

  const templates = await prisma.recurringRaidTemplate.findMany({
    where: {
      guildId: membership.guild.id,
      isActive: true,
      ...(templateId ? { id: templateId } : {}),
    },
  });

  if (templates.length === 0) return NextResponse.json({ created: 0 });

  const now = new Date();
  let created = 0;

  for (const tmpl of templates) {
    for (let week = 0; week < weeks; week++) {
      // Calculate next occurrence of dayOfWeek from today + week offset
      const base = new Date(now);
      base.setDate(base.getDate() + week * 7);
      const diff = (tmpl.dayOfWeek - base.getDay() + 7) % 7;
      const eventDate = new Date(base);
      eventDate.setDate(base.getDate() + diff);

      const [hours, mins] = tmpl.startTime.split(":").map(Number);
      eventDate.setHours(hours, mins, 0, 0);

      // Skip dates in the past
      if (eventDate <= now) continue;

      // Skip if an event from this template already exists within ±1 day of this date
      const existing = await prisma.raidEvent.findFirst({
        where: {
          recurringTemplateId: tmpl.id,
          scheduledAt: {
            gte: new Date(eventDate.getTime() - 86400000),
            lte: new Date(eventDate.getTime() + 86400000),
          },
        },
      });
      if (existing) continue;

      await prisma.raidEvent.create({
        data: {
          guildId: membership.guild.id,
          recurringTemplateId: tmpl.id,
          title: tmpl.title,
          raidZone: tmpl.raidZone,
          scheduledAt: eventDate,
          maxAttendees: tmpl.maxAttendees,
          minItemLevel: tmpl.minItemLevel,
          description: tmpl.description,
        },
      });
      created++;
    }
  }

  return NextResponse.json({ created, weeksGenerated: weeks, templatesUsed: templates.length });
}

export { DAY_NAMES };
