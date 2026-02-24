import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RaidsClient from "./RaidsClient";

interface Props { params: Promise<{ guildSlug: string }> }

export default async function RaidsPage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug } },
    include: { guild: true },
  });
  if (!membership) redirect("/");

  const [events, userCharacters] = await Promise.all([
    prisma.raidEvent.findMany({
      where: { guildId: membership.guild.id },
      include: { _count: { select: { signups: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.character.findMany({
      where: { userId: membership.userId, guildId: membership.guild.id },
    }),
  ]);

  const isOfficer = ["GM", "OFFICER"].includes(membership.role);

  return (
    <RaidsClient
      events={events}
      guildSlug={guildSlug}
      isOfficer={isOfficer}
      userCharacters={userCharacters}
    />
  );
}
