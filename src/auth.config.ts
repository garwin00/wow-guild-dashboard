import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth config — no Prisma, no bcrypt.
 * Used by middleware. The full config (with adapter + providers) is in src/lib/auth.ts.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  providers: [], // providers are registered in lib/auth.ts, not needed here
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isAuthPage =
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/reset-password") ||
        pathname.startsWith("/onboarding");

      const isPublicAsset =
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon") ||
        pathname.match(/\.(png|jpg|ico|svg)$/);

      if (isPublicAsset) return true;

      if (isAuthPage) {
        // Redirect logged-in users away from auth pages
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      // Everything else requires login
      if (!isLoggedIn) return false; // NextAuth redirects to pages.signIn

      return true;
    },
  },
} satisfies NextAuthConfig;
