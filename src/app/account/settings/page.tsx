import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AccountSettingsClient from "./AccountSettingsClient";

export default async function AccountSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, email: true, name: true, battletag: true,
      bnetId: true, image: true, password: true,
      accounts: { select: { provider: true } },
    },
  });
  if (!user) redirect("/login");

  const hasBnet = !user.bnetId.startsWith("email:");
  const hasPassword = !!user.password;
  const linkedProviders = user.accounts.map(a => a.provider);

  return (
    <AccountSettingsClient
      user={{ id: user.id, email: user.email, name: user.name, battletag: user.battletag, image: user.image }}
      hasBnet={hasBnet}
      hasPassword={hasPassword}
      linkedProviders={linkedProviders}
    />
  );
}
