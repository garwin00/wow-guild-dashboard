import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) redirect("/");

  const [guilds, users] = await Promise.all([
    prisma.guild.findMany({
      include: { _count: { select: { memberships: true, characters: true, raidEvents: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      select: {
        id: true, email: true, battletag: true, bnetId: true,
        isAdmin: true, createdAt: true,
        _count: { select: { memberships: true, characters: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return <AdminClient guilds={guilds} users={users} />;
}
