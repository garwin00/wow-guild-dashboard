import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import type { AdapterUser } from "next-auth/adapters";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";

const BNET_REGION = process.env.BLIZZARD_REGION ?? "eu";

// Wrap PrismaAdapter to handle custom bnetId/battletag fields + email-based account merging
function customAdapter() {
  const base = PrismaAdapter(prisma);
  return {
    ...base,
    createUser: async (data: AdapterUser & { bnetId?: string; battletag?: string }) => {
      // If a user with this email already exists (registered via email/password),
      // update their record with Battle.net details rather than creating a duplicate
      if (data.email) {
        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing) {
          const updated = await prisma.user.update({
            where: { id: existing.id },
            data: {
              bnetId: data.bnetId ?? existing.bnetId,
              battletag: (data as { battletag?: string }).battletag ?? existing.battletag,
              name: data.name ?? existing.name,
              image: data.image ?? existing.image,
            },
          });
          return { ...updated, email: updated.email ?? "" } as AdapterUser;
        }
      }

      const user = await prisma.user.create({
        data: {
          id: data.id,
          name: data.name ?? null,
          email: data.email ?? null,
          emailVerified: data.emailVerified ?? null,
          image: data.image ?? null,
          bnetId: data.bnetId ?? data.id ?? "",
          battletag: (data as { battletag?: string }).battletag ?? data.name ?? "",
        },
      });
      return { ...user, email: user.email ?? "" } as AdapterUser;
    },
    // Override getUserByAccount so that merged accounts (where account.userId may point to
    // the old id) still resolve correctly via the email-matched user
    getUserByAccount: async (params: { providerAccountId: string; provider: string }) => {
      const account = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider: params.provider, providerAccountId: params.providerAccountId } },
        include: { user: true },
      });
      if (!account) return null;
      return { ...account.user, email: account.user.email ?? "" } as AdapterUser;
    },
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  trustHost: true, // Use actual request URL for callbacks — handles www vs non-www on Vercel
  adapter: customAdapter(),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.battletag || user.name };
      },
    }),
    {
      id: "battlenet",
      name: "Battle.net",
      type: "oauth",
      authorization: {
        url: `https://${BNET_REGION}.battle.net/oauth/authorize`,
        params: { scope: "wow.profile", response_type: "code" },
      },
      token: `https://${BNET_REGION}.battle.net/oauth/token`,
      userinfo: `https://${BNET_REGION}.battle.net/oauth/userinfo`,
      clientId: process.env.BLIZZARD_CLIENT_ID,
      clientSecret: process.env.BLIZZARD_CLIENT_SECRET,
      checks: ["state"],
      profile(profile) {
        return {
          id: String(profile.id ?? profile.sub),
          bnetId: String(profile.id ?? profile.sub),
          battletag: profile.battletag ?? profile.battle_tag ?? "Unknown",
          name: profile.battletag ?? profile.battle_tag ?? "Unknown",
          email: profile.email ?? null,
          image: null,
        };
      },
    },
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, account }) {
      // On first sign-in, persist user.id and bnetId into the token
      if (user) {
        token.sub = user.id;
        token.bnetId = (user as { bnetId?: string }).bnetId;
      }
      // After OAuth, store the access token for BNet API calls
      if (account?.provider === "battlenet") {
        token.bnetAccessToken = account.access_token;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      (session as { bnetAccessToken?: string }).bnetAccessToken = token.bnetAccessToken as string | undefined;
      return session;
    },
  },
});

