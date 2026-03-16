/** Discord webhook integration for ZugZug guild events. */

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

interface WebhookPayload {
  username?: string;
  avatar_url?: string;
  embeds: DiscordEmbed[];
}

const ZUGZUG_COLOUR = 0xc8a96a; // WoW gold
const ZUGZUG_USERNAME = "ZugZug";

export async function sendDiscordWebhook(
  url: string,
  embed: DiscordEmbed
): Promise<{ ok: boolean; error?: string }> {
  try {
    const payload: WebhookPayload = {
      username: ZUGZUG_USERNAME,
      embeds: [{ color: ZUGZUG_COLOUR, ...embed }],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Discord returned ${res.status}: ${text}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export function raidCreatedEmbed(title: string, zone: string, scheduledAt: Date, guildSlug: string): DiscordEmbed {
  return {
    title: `📅 New Raid Scheduled`,
    description: `**${title}** — ${zone}`,
    fields: [
      {
        name: "When",
        value: scheduledAt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        inline: true,
      },
    ],
    footer: { text: `ZugZug · ${guildSlug}` },
    timestamp: new Date().toISOString(),
  };
}

export function signupChangedEmbed(
  characterName: string,
  status: string,
  raidTitle: string,
  guildSlug: string
): DiscordEmbed {
  const icon = status === "ACCEPTED" ? "✅" : status === "DECLINED" ? "❌" : "❓";
  return {
    title: `${icon} Signup Update`,
    description: `**${characterName}** marked as **${status.toLowerCase()}** for **${raidTitle}**`,
    footer: { text: `ZugZug · ${guildSlug}` },
    timestamp: new Date().toISOString(),
  };
}

export function rosterSyncedEmbed(count: number, guildName: string, guildSlug: string): DiscordEmbed {
  return {
    title: `🔄 Roster Synced`,
    description: `**${guildName}** roster updated — ${count} character${count !== 1 ? "s" : ""} refreshed from Blizzard.`,
    footer: { text: `ZugZug · ${guildSlug}` },
    timestamp: new Date().toISOString(),
  };
}

export function testWebhookEmbed(): DiscordEmbed {
  return {
    title: "✅ ZugZug Webhook Connected",
    description: "Your Discord webhook is working correctly. Guild events will appear here.",
    footer: { text: "ZugZug" },
    timestamp: new Date().toISOString(),
  };
}

interface WebhookEvents {
  raidCreated?: boolean;
  signupChanged?: boolean;
  rosterSynced?: boolean;
}

export function parseWebhookEvents(json: string | null): WebhookEvents {
  if (!json) return { raidCreated: true, signupChanged: true, rosterSynced: true };
  try { return JSON.parse(json) as WebhookEvents; } catch { return {}; }
}
