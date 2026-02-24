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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl wow-heading" style={{ color: "#f0c040" }}>{guild.name}</h1>
        <p className="mt-1" style={{ color: "#8a8070" }}>{guild.realm} · {guild.region.toUpperCase()}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-lg p-5" style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.15)" }}>
            <p className="text-xs uppercase tracking-widest" style={{ fontFamily: "var(--font-cinzel), serif", color: "#5a5040" }}>{label}</p>
            <p className="text-xl font-semibold mt-2" style={{ color: "#e8dfc8" }}>{value}</p>
          </div>
        ))}
      </div>

      {nextRaid && (
        <div className="rounded-lg p-6" style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.2)" }}>
          <div className="wow-divider mb-4" />
          <h2 className="text-sm uppercase tracking-widest mb-3" style={{ fontFamily: "var(--font-cinzel), serif", color: "#c8a96a" }}>Next Raid</h2>
          <p className="font-medium" style={{ color: "#e8dfc8" }}>{nextRaid.title}</p>
          <p className="text-sm mt-1" style={{ color: "#8a8070" }}>
            {new Date(nextRaid.scheduledAt).toLocaleString("en-GB")} · {nextRaid.raidZone}
          </p>
          <p className="text-sm mt-1" style={{ color: "#5a5040" }}>
            {nextRaid._count.signups} / {nextRaid.maxAttendees} signed up
          </p>
          <div className="wow-divider mt-4" />
        </div>
      )}

      {!nextRaid && (
        <div className="rounded-lg p-6 text-center" style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.1)", color: "#5a5040" }}>
          No raids scheduled. Officers can create one under <strong style={{ color: "#8a8070" }}>Raids</strong>.
        </div>
      )}
    </div>
  );
}
