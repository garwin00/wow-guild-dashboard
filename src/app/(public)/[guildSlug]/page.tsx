import { Metadata } from "next";
import PublicGuildClient from "./PublicGuildClient";

interface Props { params: Promise<{ guildSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { guildSlug } = await params;
  return {
    title: `Join ${guildSlug} | ZugZug`,
    description: `Apply to join a World of Warcraft guild on ZugZug.`,
  };
}

export default async function PublicGuildPage({ params }: Props) {
  const { guildSlug } = await params;
  return <PublicGuildClient guildSlug={guildSlug} />;
}
