import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import type { AdapterUser } from "next-auth/adapters";
import bcrypt from "bcryptjs";

const BNET_REGION = process.env.BLIZZARD_REGION ?? "eu";

// Wrap PrismaAdapter to handle custom bnetId/battletag fields
function customAdapter() {
  const base = PrismaAdapter(prisma);
  return {
    ...base,
    createUser: async (data: AdapterUser & { bnetId?: string; battletag?: string }) => {
      const user = await prisma.user.create({
        data: {
          id: data.id,
          name: data.name ?? null,
          email: data.email ?? null,
          emailVerified: data.emailVerified ?? null,
          image: data.image ?? null,
          bnetId: data.bnetId ?? data.id ?? "",
          battletag: data.battletag ?? data.name ?? "",
        },
      });
      return { ...user, email: user.email ?? "" } as AdapterUser;
    },
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
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
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
