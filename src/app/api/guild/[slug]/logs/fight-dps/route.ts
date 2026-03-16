import { NextRequest, NextResponse } from "next/server";
import { getSession, getGuildMembership } from "@/lib/queries";
import { getReportFights, getFightDps } from "@/lib/warcraftlogs";

interface WclActor {
  id: number;
  name: string;
  subType: string; // WoW class name
}

interface WclFight {
  id: number;
  name: string;
  difficulty: number | null;
  kill: boolean;
  startTime: number;
  endTime: number;
  friendlyPlayers: number[];
}

interface RankingEntry {
  name: string;
  class: string;
  spec: string;
  amount: number;
  rankPercent: number;
  type: string; // "DPS" | "HealerCombinedWith" etc.
}

interface FightRanking {
  fightID: number;
  encounter: { id: number; name: string };
  duration: number;
  rankings: RankingEntry[];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getGuildMembership(session.user.id, slug);
  if (!membership)
    return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const reportCode = req.nextUrl.searchParams.get("reportCode");
  if (!reportCode)
    return NextResponse.json({ error: "reportCode is required" }, { status: 400 });

  try {
    // Fetch fight list and player list in parallel with DPS rankings
    const [fightsData, rankingsData] = await Promise.all([
      getReportFights(reportCode) as Promise<{
        reportData: {
          report: {
            title: string;
            fights: WclFight[];
            masterData: { actors: WclActor[] };
          };
        };
      }>,
      getFightDps(reportCode, []) as Promise<{
        reportData: { report: { rankings: { data: FightRanking[] } } };
      }>,
    ]);

    const report = fightsData?.reportData?.report;
    if (!report) {
      return NextResponse.json({ error: "Report not found on WCL" }, { status: 404 });
    }

    const kills = (report.fights ?? []).filter((f) => f.kill);
    const killIds = kills.map((f) => f.id);

    // Re-fetch rankings with the actual kill fight IDs
    const killRankingsData = (await getFightDps(reportCode, killIds)) as {
      reportData: { report: { rankings: { data: FightRanking[] } } };
    };

    const rankings: FightRanking[] =
      killRankingsData?.reportData?.report?.rankings?.data ?? [];

    return NextResponse.json({
      title: report.title,
      fights: kills,
      actors: report.masterData?.actors ?? [],
      rankings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "WCL request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
