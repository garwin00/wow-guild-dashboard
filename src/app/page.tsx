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
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#09090e" }}>
      <div style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.15)", borderRadius: "1rem", padding: "2.5rem", width: "100%", maxWidth: "28rem" }}>
        <h1 className="wow-heading text-2xl font-bold" style={{ color: "#f0c040", marginBottom: "1.5rem" }}>Your Guilds</h1>
        {memberships.length === 0 ? (
          <div className="text-center py-8">
            <p style={{ color: "#8a8070", marginBottom: "1rem" }}>You&apos;re not in any guilds yet.</p>
            <Link href="/guilds/new" className="wow-btn">
              Create a Guild
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {memberships.map(({ guild, role }) => (
              <li key={guild.id}>
                <Link
                  href={`/${guild.slug}/overview`}
                  className="flex items-center justify-between rounded-lg px-4 py-3 transition-colors"
                  style={{ background: "#0f1019", border: "1px solid rgba(200,169,106,0.15)", borderRadius: "0.5rem" }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(200,169,106,0.04)"; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#0f1019"; }}
                >
                  <div>
                    <p style={{ color: "#e8dfc8", fontWeight: 500 }}>{guild.name}</p>
                    <p style={{ color: "#8a8070", fontSize: "0.875rem" }}>{guild.realm} · {guild.region.toUpperCase()}</p>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#5a5040", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-cinzel), serif" }}>{role}</span>
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link
                href="/guilds/new"
                className="block text-center text-sm transition-colors"
                style={{ color: "#c8a96a" }}
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
