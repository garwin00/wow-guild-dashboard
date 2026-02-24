import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const BNET_REGION = process.env.BLIZZARD_REGION ?? "eu";
const CLIENT_ID = process.env.BLIZZARD_CLIENT_ID!;
const CLIENT_SECRET = process.env.BLIZZARD_CLIENT_SECRET!;
const APP_URL = process.env.NEXTAUTH_URL ?? "https://www.zugzug.pro";
const CALLBACK_URL = `${APP_URL}/api/auth/link-battlenet/callback`;

// GET /api/auth/link-battlenet — start the OAuth flow
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const state = crypto.randomBytes(16).toString("hex");
  const returnTo = req.nextUrl.searchParams.get("returnTo") ?? "/guilds/new";

  const authUrl = new URL(`https://${BNET_REGION}.battle.net/oauth/authorize`);
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", CALLBACK_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "wow.profile");
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl.toString());
  // Store state + userId + returnTo in a short-lived cookie
  res.cookies.set("bnet_link_state", JSON.stringify({ state, userId: session.user.id, returnTo }), {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
  });
  return res;
}
