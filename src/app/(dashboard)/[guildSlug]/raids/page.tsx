import { redirect } from "next/navigation";
import { getSession, getGuildMembership } from "@/lib/queries";
import RaidsClient from "./RaidsClient";

interface Props { params: Promise<{ guildSlug: string }> }

export default async function RaidsPage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const membership = await getGuildMembership(session.user.id, guildSlug);
  if (!membership) redirect("/");

  return (
    <RaidsClient
      guildSlug={guildSlug}
      isOfficer={["GM", "OFFICER"].includes(membership.role)}
    />
  );
}
