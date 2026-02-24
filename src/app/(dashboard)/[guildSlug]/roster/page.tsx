import { redirect } from "next/navigation";
import { getSession, getGuildMembership } from "@/lib/queries";
import RosterClient from "./RosterClient";

interface Props { params: Promise<{ guildSlug: string }> }

export default async function RosterPage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const membership = await getGuildMembership(session.user.id, guildSlug);
  if (!membership) redirect("/");

  return (
    <RosterClient
      guildSlug={guildSlug}
      isOfficer={["GM", "OFFICER"].includes(membership.role)}
      guildName={membership.guild.name}
      currentUserId={session.user.id}
    />
  );
}
