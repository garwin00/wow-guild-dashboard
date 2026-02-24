import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { signOut } from "@/lib/auth";

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

  const navLinks = [
    { href: `/${guildSlug}/overview`, label: "Overview", icon: "🏠" },
    { href: `/${guildSlug}/roster`, label: "Roster", icon: "👥" },
    { href: `/${guildSlug}/raids`, label: "Raids", icon: "📅" },
    { href: `/${guildSlug}/logs`, label: "Logs", icon: "📊" },
    { href: `/${guildSlug}/settings`, label: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <p className="text-white font-bold truncate">{guild.name}</p>
          <p className="text-gray-400 text-xs truncate">{guild.realm} · {guild.region.toUpperCase()}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navLinks.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white text-sm transition-colors"
            >
              <span>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-800">
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
