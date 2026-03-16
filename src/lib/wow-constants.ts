/** Shared WoW game constants used across client and server components. */

export const CLASS_COLOR: Record<string, string> = {
  "death knight": "#C41E3A",
  "demon hunter": "#A330C9",
  druid: "#FF7C0A",
  evoker: "#33937F",
  hunter: "#AAD372",
  mage: "#3FC7EB",
  monk: "#00FF98",
  paladin: "#F48CBA",
  priest: "#FFFFFF",
  rogue: "#FFF468",
  shaman: "#0070DD",
  warlock: "#8788EE",
  warrior: "#C69B3A",
};

export function classColor(cls: string): string {
  return CLASS_COLOR[cls.toLowerCase()] ?? "#9ca3af";
}

/** Returns a CSS colour for a WCL parse percentile (0-100). */
export function parseColor(pct: number): string {
  if (pct >= 95) return "#e268a8"; // pink  — legendary
  if (pct >= 75) return "#ff8000"; // orange — epic
  if (pct >= 50) return "#a335ee"; // purple — rare
  if (pct >= 25) return "#0070dd"; // blue   — uncommon
  return "#1eff00";                // green  — common
}
