import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BNET_REGION = process.env.BLIZZARD_REGION ?? "eu";
const CLIENT_ID = process.env.BLIZZARD_CLIENT_ID!;
const CLIENT_SECRET = process.env.BLIZZARD_CLIENT_SECRET!;
const APP_URL = process.env.NEXTAUTH_URL ?? "https://www.zugzug.pro";
const CALLBACK_URL = `${APP_URL}/api/auth/link-battlenet/callback`;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");

  // Read and clear the state cookie
  const cookieRaw = req.cookies.get("bnet_link_state")?.value;
  const clearCookie = (res: NextResponse) => {
    res.cookies.set("bnet_link_state", "", { maxAge: 0, path: "/" });
    return res;
  };

  if (!cookieRaw || !code || !returnedState) {
    return clearCookie(NextResponse.redirect(new URL("/account/settings?error=bnet_link_failed", APP_URL)));
  }

  let stored: { state: string; userId: string; returnTo: string };
  try { stored = JSON.parse(cookieRaw); } catch {
    return clearCookie(NextResponse.redirect(new URL("/account/settings?error=bnet_link_failed", APP_URL)));
  }

  if (stored.state !== returnedState) {
    return clearCookie(NextResponse.redirect(new URL("/account/settings?error=bnet_link_failed", APP_URL)));
  }

  // Exchange code for access token
  const tokenRes = await fetch(`https://${BNET_REGION}.battle.net/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: CALLBACK_URL,
    }),
  });

  if (!tokenRes.ok) {
    console.error("[link-battlenet] token exchange failed:", await tokenRes.text());
    return clearCookie(NextResponse.redirect(new URL("/account/settings?error=bnet_link_failed", APP_URL)));
  }

  const { access_token } = await tokenRes.json();

  // Get BNet user info
  const userRes = await fetch(`https://${BNET_REGION}.battle.net/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userRes.ok) {
    return clearCookie(NextResponse.redirect(new URL("/account/settings?error=bnet_link_failed", APP_URL)));
  }

  const profile = await userRes.json();
  const bnetId = String(profile.id ?? profile.sub);
  const battletag = profile.battletag ?? profile.battle_tag ?? null;

  // Update the user record
  await prisma.user.update({
    where: { id: stored.userId },
    data: {
      bnetId,
      battletag,
      name: battletag ?? undefined,
    },
  });

  const returnTo = stored.returnTo ?? "/guilds/new";
  const successUrl = new URL(returnTo.startsWith("/") ? `${APP_URL}${returnTo}` : returnTo);
  successUrl.searchParams.set("bnet_linked", "1");
  return clearCookie(NextResponse.redirect(successUrl.toString()));
}
