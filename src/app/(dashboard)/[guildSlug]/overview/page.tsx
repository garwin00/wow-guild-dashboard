import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ guildSlug: string }>;
}

export default async function OverviewPage({ params }: Props) {
  const { guildSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [membership, nextRaid, signupCount, rosterCount] = await Promise.all([
    prisma.guildMembership.findFirst({
      where: { userId: session.user.id, guild: { slug: guildSlug } },
      include: { guild: true },
    }),
    prisma.raidEvent.findFirst({
      where: { guild: { slug: guildSlug }, status: "OPEN", scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
      include: { _count: { select: { signups: true } } },
    }),
    prisma.signup.count({
      where: { raidEvent: { guild: { slug: guildSlug } } },
    }),
    prisma.guildMembership.count({
      where: { guild: { slug: guildSlug } },
    }),
  ]);

  if (!membership) redirect("/");
  const { guild } = membership;

  const stats = [
    { label: "Members", value: rosterCount },
    { label: "Total Signups", value: signupCount },
    { label: "Next Raid", value: nextRaid ? new Date(nextRaid.scheduledAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "None scheduled" },
    { label: "Your Role", value: membership.role },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">{guild.name}</h1>
        <p className="text-gray-400 mt-1">{guild.realm} · {guild.region.toUpperCase()}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-400 text-sm">{label}</p>
            <p className="text-white text-xl font-semibold mt-1">{value}</p>
          </div>
        ))}
      </div>

      {nextRaid && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-2">Next Raid</h2>
          <p className="text-gray-300">{nextRaid.title}</p>
          <p className="text-gray-400 text-sm mt-1">
            {new Date(nextRaid.scheduledAt).toLocaleString("en-GB")} · {nextRaid.raidZone}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {nextRaid._count.signups} / {nextRaid.maxAttendees} signed up
          </p>
        </div>
      )}

      {!nextRaid && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500">
          No raids scheduled. Officers can create one under <strong className="text-gray-400">Raids</strong>.
        </div>
      )}
    </div>
  );
}
