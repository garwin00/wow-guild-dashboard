import { redirect } from "next/navigation";
import { getSession, getGuildMembership } from "@/lib/queries";
import SettingsClient from "./SettingsClient";

interface Props { params: Promise<{ guildSlug: string }> }

export default async function SettingsPage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const membership = await getGuildMembership(session.user.id, guildSlug);
  if (!membership || !["GM", "OFFICER"].includes(membership.role)) redirect(`/${guildSlug}/overview`);

  return (
    <SettingsClient
      guildSlug={guildSlug}
      isGm={membership.role === "GM"}
    />
  );
}
