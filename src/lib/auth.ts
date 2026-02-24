import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const BNET_REGION = process.env.BLIZZARD_REGION ?? "eu";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    {
      id: "battlenet",
      name: "Battle.net",
      type: "oauth",
      authorization: {
        url: `https://${BNET_REGION}.battle.net/oauth/authorize`,
        params: { scope: "wow.profile openid" },
      },
      token: `https://${BNET_REGION}.battle.net/oauth/token`,
      userinfo: `https://${BNET_REGION}.battle.net/oauth/userinfo`,
      clientId: process.env.BLIZZARD_CLIENT_ID,
      clientSecret: process.env.BLIZZARD_CLIENT_SECRET,
      profile(profile) {
        return {
          id: String(profile.id ?? profile.sub),
          bnetId: String(profile.id ?? profile.sub),
          battletag: profile.battletag ?? profile.name ?? "Unknown",
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
