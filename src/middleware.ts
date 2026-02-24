import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextRequest, NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Wrap in try/catch: a malformed or stale JWT cookie causes NextAuth to throw
// in the edge runtime, returning NS_ERROR_FAILURE to the browser. If that happens,
// clear the bad cookies and redirect to login so the user can start fresh.
export default async function middleware(req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (auth as any)(req);
  } catch (e) {
    console.error("[middleware] auth error — clearing session cookies", e);
    const loginUrl = new URL("/login", req.url);
    const res = NextResponse.redirect(loginUrl);
    // Clear all authjs cookies so the user gets a clean state
    for (const name of req.cookies.getAll().map((c) => c.name)) {
      if (name.includes("authjs") || name.includes("next-auth")) {
        res.cookies.delete(name);
      }
    }
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
