import { redirect } from "next/navigation";
import { getSession, getGuildMembership } from "@/lib/queries";
import MythicPlusClient from "./MythicPlusClient";

interface Props { params: Promise<{ guildSlug: string }> }

export default async function MythicPlusPage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const membership = await getGuildMembership(session.user.id, guildSlug);
  if (!membership) redirect("/");

  return (
    <MythicPlusClient
      guildSlug={guildSlug}
      isOfficer={["GM", "OFFICER"].includes(membership.role)}
      guildName={membership.guild.name}
      guildRegion={membership.guild.region}
    />
  );
}
