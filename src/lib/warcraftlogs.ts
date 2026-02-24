const WCL_TOKEN_URL = "https://www.warcraftlogs.com/oauth/token";
const WCL_API_URL = "https://www.warcraftlogs.com/api/v2/client";

async function getWclToken(): Promise<string> {
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
  const data = await res.json();
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
    query GuildReports($guildName: String!, $serverSlug: String!, $serverRegion: String!, $limit: Int!) {
      reportData {
        reports(guildName: $guildName, serverSlug: $serverSlug, serverRegion: $serverRegion, limit: $limit) {
          data {
            code
            title
            startTime
            endTime
            zone { name }
            fights { id name difficulty kill }
          }
        }
      }
    }
  `;
  return wclQuery(query, { guildName, serverSlug, serverRegion, limit });
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
