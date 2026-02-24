const BASE = "https://raider.io/api/v1";

export interface RioAffix {
  id: number;
  name: string;
  description: string;
  wowhead_url: string;
  icon: string; // relative icon name, e.g. "ability_rogue_shadowstep"
}

export interface RioAffixDetail {
  id: number;
  name: string;
  description: string;
  icon: string;
  icon_url: string;
  wowhead_url: string;
}

export interface RioAffixesResponse {
  region: string;
  title: string;
  leaderboard_url: string;
  affix_details: RioAffixDetail[];
}

export interface RioScoreColor {
  score: number;
  rgbHex: string;
}

export interface RioMythicPlusScores {
  all: number;
  dps: number;
  healer: number;
  tank: number;
  spec_0: number;
  spec_1: number;
  spec_2: number;
  spec_3: number;
  class?: string;
  colors?: {
    all?: RioScoreColor;
    dps?: RioScoreColor;
    healer?: RioScoreColor;
    tank?: RioScoreColor;
  };
}

export interface RioBestRun {
  dungeon: string;
  short_name: string;
  mythic_level: number;
  completed_at: string;
  clear_time_ms: number;
  par_time_ms: number;
  num_keystone_upgrades: number;
  score: number;
  url: string;
  affixes: RioAffix[];
  tank?: { name: string; spec: string };
  healer?: { name: string; spec: string };
}

export interface RioCharacterProfile {
  name: string;
  race: string;
  class: string;
  active_spec_name: string;
  active_spec_role: string;
  gender: string;
  faction: string;
  achievement_points: number;
  region: string;
  realm: string;
  profile_url: string;
  thumbnail_url: string;
  mythic_plus_scores_by_season?: Array<{
    season: string;
    scores: RioMythicPlusScores;
    segments: {
      all: RioScoreColor;
      dps: RioScoreColor;
      healer: RioScoreColor;
      tank: RioScoreColor;
    };
  }>;
  mythic_plus_best_runs?: RioBestRun[];
  mythic_plus_alternate_runs?: RioBestRun[];
}

/** Fetch M+ profile for a single character. Returns null if not found. */
export async function getCharacterMythicPlus(
  region: string,
  realm: string,
  name: string
): Promise<RioCharacterProfile | null> {
  const params = new URLSearchParams({
    region: region.toLowerCase(),
    realm,
    name,
    fields: "mythic_plus_scores_by_season:current,mythic_plus_best_runs",
  });
  const res = await fetch(`${BASE}/characters/profile?${params}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Raider.IO ${res.status}: ${text}`);
  }
  return res.json();
}

/** Fetch current weekly affixes for a region. */
export async function getCurrentAffixes(region: string): Promise<RioAffixesResponse | null> {
  const params = new URLSearchParams({ region: region.toLowerCase(), locale: "en" });
  const res = await fetch(`${BASE}/mythic-plus/affixes?${params}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 }, // cache 1 hour
  });
  if (!res.ok) return null;
  return res.json();
}

/** Map Raider.IO score to a CSS colour string. */
export function scoreColor(score: number): string {
  if (score >= 3000) return "#ff8000"; // legendary orange
  if (score >= 2500) return "#a335ee"; // epic purple
  if (score >= 2000) return "#0070dd"; // rare blue
  if (score >= 1500) return "#1eff00"; // uncommon green
  if (score >= 1000) return "#ffffff"; // common white
  return "#9d9d9d"; // poor grey
}

/**
 * Fetch just the thumbnail_url for a character from Raider.IO.
 * Returns the raw avatar URL (ends in -avatar.jpg) or null if not indexed.
 */
export async function fetchCharacterAvatar(
  region: string,
  realm: string,
  name: string
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      region: region.toLowerCase(),
      realm,
      name,
      fields: "thumbnail_url",
    });
    const res = await fetch(`${BASE}/characters/profile?${params}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.thumbnail_url as string) ?? null;
  } catch {
    return null;
  }
}

/**
 * Given an avatar URL (ending -avatar.jpg), return the bust/inset variant (230×116).
 * Falls back to the original if the URL doesn't match the expected pattern.
 */
export function avatarToInset(avatarUrl: string): string {
  // Strip query string, swap suffix
  const base = avatarUrl.split("?")[0];
  if (base.endsWith("-avatar.jpg")) {
    return base.replace("-avatar.jpg", "-inset.jpg");
  }
  return base;
}
