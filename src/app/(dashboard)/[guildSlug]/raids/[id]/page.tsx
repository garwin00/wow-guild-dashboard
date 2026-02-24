import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RaidDetailClient from "./RaidDetailClient";

interface Props { params: Promise<{ guildSlug: string; id: string }> }

export default async function RaidDetailPage({ params }: Props) {
  const { guildSlug, id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug } },
    include: { guild: true },
  });
  if (!membership) redirect("/");

  const [event, signups, userCharacters] = await Promise.all([
    prisma.raidEvent.findUnique({
      where: { id },
      include: { _count: { select: { signups: true } } },
    }),
    prisma.signup.findMany({
      where: { raidEventId: id },
      include: { character: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.character.findMany({
      where: { userId: session.user.id, guildId: membership.guild.id },
    }),
  ]);

  if (!event) redirect(`/${guildSlug}/raids`);

  const isOfficer = ["GM", "OFFICER"].includes(membership.role);

  return (
    <RaidDetailClient
      event={event}
      signups={signups}
      guildSlug={guildSlug}
      isOfficer={isOfficer}
      userCharacters={userCharacters}
      userId={session.user.id}
    />
  );
}
