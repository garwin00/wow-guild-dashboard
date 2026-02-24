import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LogsClient from "./LogsClient";

interface Props { params: Promise<{ guildSlug: string }> }

export default async function LogsPage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug } },
    include: { guild: true },
  });
  if (!membership) redirect("/");

  const [reports, guild] = await Promise.all([
    prisma.logReport.findMany({
      where: { guildId: membership.guild.id },
      include: { _count: { select: { parses: true } } },
      orderBy: { startTime: "desc" },
    }),
    prisma.guild.findUnique({ where: { id: membership.guild.id } }),
  ]);

  const isOfficer = ["GM", "OFFICER"].includes(membership.role);

  return <LogsClient reports={reports} guild={guild!} guildSlug={guildSlug} isOfficer={isOfficer} />;
}
