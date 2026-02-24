import { redirect } from "next/navigation";
import { getSession, getGuildMembership } from "@/lib/queries";
import ProfileClient from "./ProfileClient";

interface Props { params: Promise<{ guildSlug: string }> }

export default async function ProfilePage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const membership = await getGuildMembership(session.user.id, guildSlug);
  if (!membership) redirect("/");

  return (
    <ProfileClient
      guildSlug={guildSlug}
      memberRole={membership.role}
    />
  );
}
