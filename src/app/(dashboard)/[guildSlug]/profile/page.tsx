import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProfileClient from "./ProfileClient";

interface Props { params: Promise<{ guildSlug: string }> }

export default async function ProfilePage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, membership, characters] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, battletag: true, email: true, image: true, bnetId: true },
    }),
    prisma.guildMembership.findFirst({
      where: { userId: session.user.id, guild: { slug: guildSlug } },
      select: { role: true },
    }),
    prisma.character.findMany({
      where: { userId: session.user.id },
      include: {
        guild: { select: { name: true, slug: true } },
        mythicScore: { select: { all: true } },
      },
      orderBy: [{ isMain: "desc" }, { itemLevel: "desc" }],
    }),
  ]);

  if (!user || !membership) redirect("/");

  return (
    <ProfileClient
      user={user}
      memberRole={membership.role}
      guildSlug={guildSlug}
      characters={characters.map(c => ({
        id: c.id,
        name: c.name,
        realm: c.realm,
        region: c.region,
        class: c.class,
        spec: c.spec,
        role: c.role,
        itemLevel: c.itemLevel,
        level: c.level,
        isMain: c.isMain,
        avatarUrl: c.avatarUrl,
        guildName: c.guild?.name ?? null,
        guildSlug: c.guild?.slug ?? null,
        mythicScore: c.mythicScore?.all ?? null,
      }))}
    />
  );
}
