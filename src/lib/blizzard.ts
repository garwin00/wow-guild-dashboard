const BNET_BASE = (region: string) =>
  `https://${region}.api.blizzard.com`;

async function getClientToken(region: string): Promise<string> {
  const res = await fetch(
    `https://${region}.battle.net/oauth/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      next: { revalidate: 3600 },
    }
  );
  const data = await res.json();
  return data.access_token as string;
}

export async function getUserWowProfile(region: string, userAccessToken: string) {
  const res = await fetch(
    `${BNET_BASE(region)}/profile/user/wow?namespace=profile-${region}&locale=en_GB`,
    { headers: { Authorization: `Bearer ${userAccessToken}` } }
  );
  if (!res.ok) throw new Error(`Blizzard API error: ${res.status}`);
  return res.json();
}

export async function getGuildRoster(
  region: string,
  realm: string,
  guildName: string
) {
  const token = await getClientToken(region);
  const realmSlug = realm.toLowerCase().replace(/\s/g, "-");
  const guildSlug = guildName.toLowerCase().replace(/\s/g, "-");

  const res = await fetch(
    `${BNET_BASE(region)}/data/wow/guild/${realmSlug}/${guildSlug}/roster?namespace=profile-${region}&locale=en_GB`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 900 },
    }
  );
  if (!res.ok) throw new Error(`Blizzard API error: ${res.status}`);
  return res.json();
}

export async function getCharacterProfile(
  region: string,
  realm: string,
  characterName: string,
  userAccessToken?: string
) {
  const token = userAccessToken ?? (await getClientToken(region));
  const realmSlug = realm.toLowerCase().replace(/\s/g, "-");
  const nameSlug = characterName.toLowerCase();

  const res = await fetch(
    `${BNET_BASE(region)}/profile/wow/character/${realmSlug}/${nameSlug}?namespace=profile-${region}&locale=en_GB`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 900 },
    }
  );
  if (!res.ok) throw new Error(`Blizzard API error: ${res.status}`);
  return res.json();
}

export async function getCharacterMedia(
  region: string,
  realm: string,
  characterName: string
) {
  const token = await getClientToken(region);
  const realmSlug = realm.toLowerCase().replace(/\s/g, "-");
  const nameSlug = characterName.toLowerCase();

  const res = await fetch(
    `${BNET_BASE(region)}/profile/wow/character/${realmSlug}/${nameSlug}/character-media?namespace=profile-${region}&locale=en_GB`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 86400 },
    }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function searchRealms(region: string) {
  const token = await getClientToken(region);
  const res = await fetch(
    `${BNET_BASE(region)}/data/wow/search/realm?namespace=dynamic-${region}&orderby=name&_page=1`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 86400 },
    }
  );
  if (!res.ok) throw new Error(`Blizzard API error: ${res.status}`);
  return res.json();
}
