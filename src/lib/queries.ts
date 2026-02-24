import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Returns the current session, deduplicated per request via React cache().
 * NextAuth v5 already caches auth() internally, but this makes it explicit.
 */
export const getSession = cache(async () => {
  return auth();
});

/**
 * Returns the guild membership (with guild) for the current user + slug,
 * deduplicated per request via React cache(). Both the layout and the page
 * call this — cache() ensures only one DB round-trip per navigation.
 */
export const getGuildMembership = cache(async (userId: string, guildSlug: string) => {
  return prisma.guildMembership.findFirst({
    where: { userId, guild: { slug: guildSlug } },
    include: { guild: true },
  });
});
