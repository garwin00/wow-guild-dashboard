import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RosterClient from "./RosterClient";

interface Props { params: Promise<{ guildSlug: string }> }

export default async function RosterPage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug } },
    include: { guild: true },
  });
  if (!membership) redirect("/");

  const characters = await prisma.character.findMany({
    where: { guildId: membership.guild.id },
    orderBy: [{ guildRank: "asc" }, { name: "asc" }],
  });

  const isOfficer = ["GM", "OFFICER"].includes(membership.role);

  return (
    <RosterClient
      characters={characters}
      guildSlug={guildSlug}
      isOfficer={isOfficer}
      guildName={membership.guild.name}
    />
  );
}
