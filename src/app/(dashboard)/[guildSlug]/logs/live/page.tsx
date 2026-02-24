import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LiveLogsClient from "./LiveLogsClient";

interface Props { params: Promise<{ guildSlug: string }> }

export default async function LiveLogsPage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug } },
    include: { guild: true },
  });
  if (!membership) redirect("/");

  const hasWcl = !!membership.guild.wclGuildId;
  return <LiveLogsClient guildSlug={guildSlug} hasWcl={hasWcl} />;
}
