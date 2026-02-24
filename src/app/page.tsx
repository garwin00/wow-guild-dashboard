import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const memberships = await prisma.guildMembership.findMany({
    where: { userId: session.user.id },
    include: { guild: true },
  });

  if (memberships.length === 0) redirect("/guilds/new");
  if (memberships.length === 1) {
    redirect(`/${memberships[0].guild.slug}/overview`);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6">Your Guilds</h1>
        {memberships.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p className="mb-4">You&apos;re not in any guilds yet.</p>
            <Link
              href="/guilds/new"
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Create a Guild
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {memberships.map(({ guild, role }) => (
              <li key={guild.id}>
                <Link
                  href={`/${guild.slug}/overview`}
                  className="flex items-center justify-between bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg px-4 py-3 transition-colors"
                >
                  <div>
                    <p className="text-white font-medium">{guild.name}</p>
                    <p className="text-gray-400 text-sm">{guild.realm} · {guild.region.toUpperCase()}</p>
                  </div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">{role}</span>
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link
                href="/guilds/new"
                className="block text-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                + Create another guild
              </Link>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
