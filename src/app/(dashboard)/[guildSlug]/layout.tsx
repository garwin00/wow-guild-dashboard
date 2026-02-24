import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/lib/auth";
import { getGuildProgression } from "@/lib/raiderio";
import SidebarNav from "./SidebarNav";

interface Props {
  children: React.ReactNode;
  params: Promise<{ guildSlug: string }>;
}

export default async function DashboardLayout({ children, params }: Props) {
  const { guildSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await prisma.guildMembership.findFirst({
    where: { userId: session.user.id, guild: { slug: guildSlug } },
    include: { guild: true },
  });

  if (!membership) redirect("/");

  const { guild } = membership;

  // Fetch progression for sidebar badge (cached 1h, non-blocking on failure)
  const progression = await getGuildProgression(guild.region, guild.realm, guild.name);
  // Pick the most progressed tier for the badge: highest mythic count, else heroic, else normal
  const progressionBadge = (() => {
    if (!progression) return null;
    const best = progression.find(t => t.mythicKilled > 0) ?? progression.find(t => t.heroicKilled > 0) ?? progression.find(t => t.normalKilled > 0);
    if (!best) return null;
    return best.summary; // e.g. "8/8 M"
  })();

  const navLinks = [
    { href: `/${guildSlug}/overview`, label: "Overview", icon: "🏠" },
    { href: `/${guildSlug}/roster`, label: "Roster", icon: "👥" },
    { href: `/${guildSlug}/raids`, label: "Raids", icon: "📅" },
    { href: `/${guildSlug}/logs`, label: "Logs", icon: "📊" },
    { href: `/${guildSlug}/logs/live`, label: "Live", icon: "🔴" },
    { href: `/${guildSlug}/mythic-plus`, label: "Mythic+", icon: "⚡" },
    { href: `/${guildSlug}/profile`, label: "Profile", icon: "👤" },
    { href: `/${guildSlug}/settings`, label: "Settings", icon: "⚙️" },
  ];

  const signOutForm = (
    <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
      <button className="w-full text-left px-3 py-2 text-xs wow-signout-btn"
        style={{ fontFamily: "inherit", letterSpacing: "0.04em" }}>
        Sign Out
      </button>
    </form>
  );

  return (
    <div className="min-h-screen flex" style={{ background: "var(--wow-bg)" }} data-theme={guild.theme ?? "default"}>
      <SidebarNav
        navLinks={navLinks}
        guildName={guild.name}
        realm={guild.realm}
        region={guild.region}
        guildImageUrl={guild.imageUrl ?? null}
        theme={guild.theme ?? "default"}
        signOutForm={signOutForm}
        progressionBadge={progressionBadge}
      />
      {/* Main content — offset on mobile for top bar */}
      <main className="flex-1 overflow-auto p-4 pt-18 md:pt-4 md:p-8">
        {children}
      </main>
    </div>
  );
}

