import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isAuth = !!req.auth;
  const isAuthPage = pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");
  const isApiAuth = pathname.startsWith("/api/auth");

  if (isApiAuth) return NextResponse.next();

  if (isAuthPage) {
    if (isAuth) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (!isAuth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin routes: middleware can only check auth, isAdmin check is in the page itself
  if (pathname.startsWith("/admin") && !isAuth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
