import { redirect } from "next/navigation";
import { getSession, getGuildMembership } from "@/lib/queries";
import LogsClient from "./LogsClient";

interface Props { params: Promise<{ guildSlug: string }> }

export default async function LogsPage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const membership = await getGuildMembership(session.user.id, guildSlug);
  if (!membership) redirect("/");

  return (
    <LogsClient
      guildSlug={guildSlug}
      isOfficer={["GM", "OFFICER"].includes(membership.role)}
    />
  );
}
