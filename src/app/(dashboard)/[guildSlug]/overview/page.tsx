import { redirect } from "next/navigation";
import { getSession, getGuildMembership } from "@/lib/queries";
import OverviewClient from "./OverviewClient";

interface Props {
  params: Promise<{ guildSlug: string }>;
}

export default async function OverviewPage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const membership = await getGuildMembership(session.user.id, guildSlug);
  if (!membership) redirect("/");

  return (
    <OverviewClient
      guild={{ name: membership.guild.name, realm: membership.guild.realm, region: membership.guild.region, slug: guildSlug }}
      memberRole={membership.role}
      isOfficer={["GM", "OFFICER"].includes(membership.role)}
    />
  );
}
