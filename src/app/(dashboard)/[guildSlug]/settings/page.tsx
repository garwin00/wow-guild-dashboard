import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

interface Props { params: Promise<{ guildSlug: string }> }

export default async function SettingsPage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug }, role: { in: ["GM", "OFFICER"] } },
    include: { guild: true },
  });
  if (!membership) redirect(`/${guildSlug}/overview`);

  const members = await prisma.guildMembership.findMany({
    where: { guildId: membership.guild.id },
    include: { user: true },
    orderBy: { role: "asc" },
  });

  return <SettingsClient guild={membership.guild} members={members} isGm={membership.role === "GM"} />;
}
