const WCL_TOKEN_URL = "https://www.warcraftlogs.com/oauth/token";
const WCL_API_URL = "https://www.warcraftlogs.com/api/v2/client";

async function getWclToken(): Promise<string> {
  if (!process.env.WCL_CLIENT_ID || !process.env.WCL_CLIENT_SECRET) {
    throw new Error("WCL_CLIENT_ID and WCL_CLIENT_SECRET are not configured");
  }
  const res = await fetch(WCL_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.WCL_CLIENT_ID}:${process.env.WCL_CLIENT_SECRET}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`WCL token request failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (!data.access_token) throw new Error("WCL token response missing access_token");
  return data.access_token as string;
}

async function wclQuery<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const token = await getWclToken();
  const res = await fetch(WCL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data as T;
}

export async function getGuildReports(
  guildName: string,
  serverSlug: string,
  serverRegion: string,
  limit = 25
) {
  const query = `
    query GuildReports($guildName: String!, $guildServerSlug: String!, $guildServerRegion: String!, $limit: Int!) {
      reportData {
        reports(guildName: $guildName, guildServerSlug: $guildServerSlug, guildServerRegion: $guildServerRegion, limit: $limit) {
          data {
            code
            title
            startTime
            endTime
            zone { name }
            fights { id name difficulty }
          }
        }
      }
    }
  `;
  return wclQuery(query, { guildName, guildServerSlug: serverSlug, guildServerRegion: serverRegion, limit });
}

export async function getReportFights(reportCode: string) {
  const query = `
    query ReportFights($code: String!) {
      reportData {
        report(code: $code) {
          title
          startTime
          endTime
          fights(killType: Kills) {
            id
            name
            difficulty
            kill
            startTime
            endTime
            friendlyPlayers
          }
          masterData {
            actors(type: "Player") {
              id
              name
              type
              subType
            }
          }
        }
      }
    }
  `;
  return wclQuery(query, { code: reportCode });
}

export async function getFightDps(reportCode: string, fightIds: number[]) {
  const query = `
    query FightDPS($code: String!, $fightIDs: [Int!]!) {
      reportData {
        report(code: $code) {
          rankings(fightIDs: $fightIDs)
        }
      }
    }
  `;
  return wclQuery(query, { code: reportCode, fightIDs: fightIds });
}

export async function getCharacterParses(
  characterName: string,
  serverSlug: string,
  serverRegion: string,
  zoneId?: number
) {
  const query = `
    query CharacterParses($name: String!, $serverSlug: String!, $serverRegion: String!, $zoneID: Int) {
      characterData {
        character(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
          name
          zoneRankings(zoneID: $zoneID)
        }
      }
    }
  `;
  return wclQuery(query, {
    name: characterName,
    serverSlug,
    serverRegion,
    zoneID: zoneId,
  });
}

export async function getActiveReport(guildName: string, serverSlug: string, serverRegion: string) {
  const query = `
    query ActiveReport($guildName: String!, $guildServerSlug: String!, $guildServerRegion: String!) {
      reportData {
        reports(guildName: $guildName, guildServerSlug: $guildServerSlug, guildServerRegion: $guildServerRegion, limit: 1) {
          data {
            code
            title
            startTime
            endTime
            zone { name id }
          }
        }
      }
    }
  `;
  type Rpt = { code: string; title: string; startTime: number; endTime: number; zone: { name: string; id: number } | null };
  type R = { reportData: { reports: { data: Rpt[] } } };
  const data = await wclQuery<R>(query, { guildName, guildServerSlug: serverSlug, guildServerRegion: serverRegion });
  const reports = data?.reportData?.reports?.data ?? [];
  return reports.find((r) => r.endTime === 0) ?? null;
}

export async function getLiveFights(reportCode: string) {
  const query = `
    query LiveFights($code: String!) {
      reportData {
        report(code: $code) {
          title
          startTime
          endTime
          zone { name }
          fights {
            id
            name
            difficulty
            bossPercentage
            fightPercentage
            startTime
            endTime
            friendlyPlayers
          }
          masterData {
            actors(type: "Player") {
              id
              name
              subType
            }
          }
        }
      }
    }
  `;
  type Fight = {
    id: number; name: string; difficulty: number | null;
    bossPercentage: number | null; fightPercentage: number | null;
    startTime: number; endTime: number; friendlyPlayers: number[];
  };
  type Actor = { id: number; name: string; subType: string };
  type R = {
    reportData: {
      report: {
        title: string; startTime: number; endTime: number;
        zone: { name: string } | null;
        fights: Fight[];
        masterData: { actors: Actor[] };
      };
    };
  };
  const data = await wclQuery<R>(query, { code: reportCode });
  return data?.reportData?.report ?? null;
}
