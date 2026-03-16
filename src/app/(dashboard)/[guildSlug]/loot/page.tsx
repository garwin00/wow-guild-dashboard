import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, getGuildMembership } from "@/lib/queries";
import LootClient from "./LootClient";

export const metadata: Metadata = {
  title: "Loot History",
  description: "Track loot awarded during ZugZug raids.",
};

export default async function LootPage({ params }: { params: Promise<{ guildSlug: string }> }) {
  const { guildSlug } = await params;
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const membership = await getGuildMembership(session.user.id, guildSlug);
  if (!membership) redirect("/login");
  const isOfficer = ["GM", "OFFICER"].includes(membership.role);
  return <LootClient guildSlug={guildSlug} isOfficer={isOfficer} />;
}
