import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentAffixes } from "@/lib/raiderio";
import MythicPlusClient from "./MythicPlusClient";

interface Props { params: Promise<{ guildSlug: string }> }

export default async function MythicPlusPage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug } },
    include: { guild: true },
  });
  if (!membership) redirect("/");

  const isOfficer = ["GM", "OFFICER"].includes(membership.role);

  const characters = await prisma.character.findMany({
    where: { guildId: membership.guild.id },
    include: { mythicScore: true, mythicRuns: { orderBy: { score: "desc" }, take: 10 } },
    orderBy: [{ name: "asc" }],
  });

  const affixes = await getCurrentAffixes(membership.guild.region);

  return (
    <MythicPlusClient
      characters={characters}
      affixes={affixes}
      guildSlug={guildSlug}
      isOfficer={isOfficer}
      guildName={membership.guild.name}
      guildRegion={membership.guild.region}
    />
  );
}
